import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, Edit, Trash2, Search } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { ExportButton } from "@/components/common/ExportButton";
import { useAuthData } from "@/hooks/useAuthData";
import { Helmet } from "react-helmet-async";

const expenseSchema = z.object({
  date: z.date(),
  type: z.string().min(1, "ประเภทค่าใช้จ่ายจำเป็นต้องระบุ"),
  amount: z.number().min(0, "จำนวนเงินต้องมากกว่าหรือเท่ากับ 0"),
});

const expenseTypeSchema = z.object({
  name: z.string().min(1, "ชื่อประเภทค่าใช้จ่ายจำเป็นต้องระบุ"),
});

type ExpenseFormData = z.infer<typeof expenseSchema>;
type ExpenseTypeFormData = z.infer<typeof expenseTypeSchema>;

export default function Expenses() {
  const { session, loading: authLoading } = useAuthData();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [isExpenseDialogOpen, setIsExpenseDialogOpen] = useState(false);
  const [isTypeDialogOpen, setIsTypeDialogOpen] = useState(false);
  const itemsPerPage = 20;

  const expenseForm = useForm<ExpenseFormData>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      date: new Date(),
      type: "",
      amount: 0,
    },
  });

  const expenseTypeForm = useForm<ExpenseTypeFormData>({
    resolver: zodResolver(expenseTypeSchema),
    defaultValues: {
      name: "",
    },
  });

  // Fetch expenses
  const { data: expenses = [], isLoading: expensesLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch expense types
  const { data: expenseTypes = [] } = useQuery({
    queryKey: ["expense-types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expense_types")
        .select("*")
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

// Send webhook notification
  const sendWebhook = async (action: string, data: any) => {
    try {
      await fetch("https://n8n.srv929073.hstgr.cloud/webhook-test/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          data,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error("Failed to send webhook:", error);
    }
  };

  // Create expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData) => {
      const { error } = await supabase.from("expenses").insert({
        date: data.date.toISOString(),
        type: data.type,
        amount: data.amount,
        owner_id: session?.user.id,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "บันทึกค่าใช้จ่ายสำเร็จ" });
      expenseForm.reset();
      setIsExpenseDialogOpen(false);
      sendWebhook("expenses_create", data);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

// Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async (data: ExpenseFormData & { id: string }) => {
      const { error } = await supabase
        .from("expenses")
        .update({
          date: data.date.toISOString(),
          type: data.type,
          amount: data.amount,
        })
        .eq("id", data.id);
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "แก้ไขค่าใช้จ่ายสำเร็จ" });
      setEditingExpense(null);
      expenseForm.reset();
      setIsExpenseDialogOpen(false);
      sendWebhook("expenses_update", data);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

// Delete expense mutation
  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get expense data before deletion for webhook
      const { data: expenseData } = await supabase.from("expenses").select("*").eq("id", id).single();
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
      return expenseData;
    },
    onSuccess: (expenseData) => {
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast({ title: "ลบค่าใช้จ่ายสำเร็จ" });
      if (expenseData) {
        sendWebhook("expenses_delete", expenseData);
      }
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Create expense type mutation
  const createExpenseTypeMutation = useMutation({
    mutationFn: async (data: ExpenseTypeFormData) => {
      const { error } = await supabase.from("expense_types").insert({
        name: data.name,
        owner_id: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense-types"] });
      toast({ title: "เพิ่มประเภทค่าใช้จ่ายสำเร็จ" });
      expenseTypeForm.reset();
      setIsTypeDialogOpen(false);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((expense) => {
      const matchesSearch = 
        expense.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.amount.toString().includes(searchTerm);
      const matchesType = typeFilter === "all" || expense.type === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [expenses, searchTerm, typeFilter]);

  // Paginated expenses
  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredExpenses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredExpenses, currentPage]);

  const totalPages = Math.ceil(filteredExpenses.length / itemsPerPage);

  const handleSubmitExpense = (data: ExpenseFormData) => {
    if (editingExpense) {
      updateExpenseMutation.mutate({ ...data, id: editingExpense.id });
    } else {
      createExpenseMutation.mutate(data);
    }
  };

  const handleEditExpense = (expense: any) => {
    setEditingExpense(expense);
    expenseForm.setValue("date", new Date(expense.date));
    expenseForm.setValue("type", expense.type);
    expenseForm.setValue("amount", parseFloat(expense.amount));
    setIsExpenseDialogOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบค่าใช้จ่ายนี้?")) {
      deleteExpenseMutation.mutate(id);
    }
  };

  const handleSubmitExpenseType = (data: ExpenseTypeFormData) => {
    createExpenseTypeMutation.mutate(data);
  };

  if (authLoading || expensesLoading) {
    return <div className="flex justify-center items-center min-h-screen">กำลังโหลด...</div>;
  }

  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">กรุณาเข้าสู่ระบบ</div>;
  }

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-background to-background/50 p-4">
      <Helmet>
        <title>ค่าใช้จ่าย | ระบบจัดการร้านค้า</title>
        <meta name="description" content="จัดการค่าใช้จ่ายของร้านค้า บันทึก แก้ไข และติดตามค่าใช้จ่ายต่างๆ" />
      </Helmet>

      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">ค่าใช้จ่าย</h1>
          <p className="text-muted-foreground">จัดการและติดตามค่าใช้จ่ายของร้านค้า</p>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาค่าใช้จ่าย..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="เลือกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {expenseTypes.map((type) => (
                    <SelectItem key={type.id} value={type.name}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <ExportButton data={filteredExpenses} filename="expenses.csv" />
            </div>

            <div className="flex gap-2">
              <Dialog open={isExpenseDialogOpen} onOpenChange={setIsExpenseDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingExpense(null); expenseForm.reset(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มค่าใช้จ่าย
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}</DialogTitle>
                  </DialogHeader>
                  <Form {...expenseForm}>
                    <form onSubmit={expenseForm.handleSubmit(handleSubmitExpense)} className="space-y-4">
                      <FormField
                        control={expenseForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>วันที่</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button variant="outline" className="w-full justify-start">
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {field.value ? format(field.value, "dd/MM/yyyy") : "เลือกวันที่"}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent>
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  className="pointer-events-auto"
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ประเภท</FormLabel>
                            <div className="flex gap-2">
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger className="flex-1">
                                  <SelectValue placeholder="เลือกประเภท" />
                                </SelectTrigger>
                                <SelectContent>
                                  {expenseTypes.map((type) => (
                                    <SelectItem key={type.id} value={type.name}>
                                      {type.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Dialog open={isTypeDialogOpen} onOpenChange={setIsTypeDialogOpen}>
                                <DialogTrigger asChild>
                                  <Button type="button" variant="outline" size="icon">
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent>
                                  <DialogHeader>
                                    <DialogTitle>เพิ่มประเภทค่าใช้จ่าย</DialogTitle>
                                  </DialogHeader>
                                  <Form {...expenseTypeForm}>
                                    <form onSubmit={expenseTypeForm.handleSubmit(handleSubmitExpenseType)}>
                                      <FormField
                                        control={expenseTypeForm.control}
                                        name="name"
                                        render={({ field }) => (
                                          <FormItem>
                                            <FormLabel>ชื่อประเภท</FormLabel>
                                            <FormControl>
                                              <Input {...field} placeholder="ชื่อประเภทค่าใช้จ่าย" />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <div className="flex justify-end mt-4">
                                        <Button type="submit">บันทึก</Button>
                                      </div>
                                    </form>
                                  </Form>
                                </DialogContent>
                              </Dialog>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={expenseForm.control}
                        name="amount"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>จำนวนเงิน</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                                placeholder="จำนวนเงิน"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button type="submit">
                          {editingExpense ? "บันทึกการแก้ไข" : "บันทึก"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paginatedExpenses.map((expense) => (
            <Card key={expense.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex justify-between items-center">
                  <span>{expense.type}</span>
                  <span className="text-lg font-bold text-primary">
                    ฿{parseFloat(expense.amount.toString()).toLocaleString()}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  วันที่: {format(new Date(expense.date), "dd/MM/yyyy")}
                </p>
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditExpense(expense)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteExpense(expense.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredExpenses.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">ไม่พบข้อมูลค่าใช้จ่าย</p>
            </CardContent>
          </Card>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-8 gap-2">
            <Button
              variant="outline"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              ก่อนหน้า
            </Button>
            <span className="flex items-center px-4">
              หน้า {currentPage} จาก {totalPages}
            </span>
            <Button
              variant="outline"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              ถัดไป
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}