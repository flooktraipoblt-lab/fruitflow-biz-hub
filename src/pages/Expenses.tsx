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
      await fetch("https://n8n.srv929073.hstgr.cloud/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
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
      const { data: createdExpense, error } = await supabase.from("expenses").insert({
        date: data.date.toISOString(),
        type: data.type,
        amount: data.amount,
        owner_id: session?.user.id,
      }).select().single();
      if (error) throw error;
      return createdExpense;
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
    <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <Helmet>
        <title>ค่าใช้จ่าย | ระบบจัดการร้านค้า</title>
        <meta name="description" content="จัดการค่าใช้จ่ายของร้านค้า บันทึก แก้ไข และติดตามค่าใช้จ่ายต่างๆ" />
      </Helmet>

      {/* Header Section */}
      <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 rounded-2xl p-8 border border-destructive/20">
        <h1 className="text-4xl font-bold text-destructive mb-2">ค่าใช้จ่าย</h1>
        <p className="text-muted-foreground">จัดการและติดตามค่าใช้จ่ายของร้านค้าอย่างมีประสิทธิภาพ</p>
      </div>

      {/* Search and Filters */}
      <Card className="shadow-elegant border-primary/10">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            ค้นหาและกรองข้อมูล
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="ค้นหาค่าใช้จ่าย..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 border-primary/20 focus:border-primary/40"
                />
              </div>
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[200px] border-primary/20 focus:border-primary/40">
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
                <Button 
                  onClick={() => { setEditingExpense(null); expenseForm.reset(); }}
                  className="bg-primary hover:bg-primary/90 shadow-glow"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  เพิ่มค่าใช้จ่าย
                </Button>
              </DialogTrigger>
              <DialogContent className="shadow-elegant">
                <DialogHeader>
                  <DialogTitle className="text-2xl text-primary">
                    {editingExpense ? "แก้ไขค่าใช้จ่าย" : "เพิ่มค่าใช้จ่าย"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...expenseForm}>
                  <form onSubmit={expenseForm.handleSubmit(handleSubmitExpense)} className="space-y-6">
                    <FormField
                      control={expenseForm.control}
                      name="date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold">วันที่</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button 
                                  variant="outline" 
                                  className="w-full justify-start border-primary/20 hover:border-primary/40"
                                >
                                  <CalendarIcon className="mr-2 h-4 w-4" />
                                  {field.value ? format(field.value, "dd/MM/yyyy") : "เลือกวันที่"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                className="p-3 pointer-events-auto"
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
                          <FormLabel className="text-base font-semibold">ประเภท</FormLabel>
                          <div className="flex gap-2">
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger className="flex-1 border-primary/20 focus:border-primary/40">
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
                                <Button type="button" variant="outline" size="icon" className="border-primary/20 hover:border-primary/40">
                                  <Plus className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="shadow-elegant">
                                <DialogHeader>
                                  <DialogTitle className="text-xl text-primary">เพิ่มประเภทค่าใช้จ่าย</DialogTitle>
                                </DialogHeader>
                                <Form {...expenseTypeForm}>
                                  <form onSubmit={expenseTypeForm.handleSubmit(handleSubmitExpenseType)} className="space-y-4">
                                    <FormField
                                      control={expenseTypeForm.control}
                                      name="name"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-base font-semibold">ชื่อประเภท</FormLabel>
                                          <FormControl>
                                            <Input 
                                              {...field} 
                                              placeholder="ชื่อประเภทค่าใช้จ่าย" 
                                              className="border-primary/20 focus:border-primary/40"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <div className="flex justify-end mt-4">
                                      <Button type="submit" className="bg-primary hover:bg-primary/90">บันทึก</Button>
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
                          <FormLabel className="text-base font-semibold">จำนวนเงิน</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value === "" ? "" : parseFloat(e.target.value))}
                              placeholder="จำนวนเงิน"
                              className="border-primary/20 focus:border-primary/40"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setIsExpenseDialogOpen(false)}>
                        ยกเลิก
                      </Button>
                      <Button type="submit" className="bg-primary hover:bg-primary/90">
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

      {/* Expenses Summary */}
      {filteredExpenses.length > 0 && (
        <Card className="shadow-elegant border-accent/20">
          <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent">
            <CardTitle className="text-xl text-accent flex items-center gap-2">
              <div className="w-2 h-6 bg-accent rounded-full"></div>
              สรุปค่าใช้จ่าย
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl p-4 border border-primary/20">
                <p className="text-sm text-muted-foreground mb-1">จำนวนรายการ</p>
                <p className="text-2xl font-bold text-primary">{filteredExpenses.length}</p>
              </div>
              <div className="bg-gradient-to-r from-destructive/10 to-destructive/5 rounded-xl p-4 border border-destructive/20">
                <p className="text-sm text-muted-foreground mb-1">ยอดรวมทั้งหมด</p>
                <p className="text-2xl font-bold text-destructive">
                  ฿{filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-gradient-to-r from-secondary/10 to-secondary/5 rounded-xl p-4 border border-secondary/20">
                <p className="text-sm text-muted-foreground mb-1">ค่าเฉลี่ยต่อรายการ</p>
                <p className="text-2xl font-bold text-secondary">
                  ฿{Math.round(filteredExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount.toString()), 0) / filteredExpenses.length).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expenses List */}
      {paginatedExpenses.length > 0 ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paginatedExpenses.map((expense) => (
            <Card key={expense.id} className="shadow-elegant hover:shadow-glow transition-all duration-300 border-primary/10 hover:border-primary/20">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent pb-4">
                <CardTitle className="text-lg flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <span className="text-primary font-semibold">{expense.type}</span>
                    <p className="text-sm text-muted-foreground font-normal">
                      {format(new Date(expense.date), "dd/MM/yyyy")}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-bold text-destructive">
                      ฿{parseFloat(expense.amount.toString()).toLocaleString()}
                    </span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEditExpense(expense)}
                    className="border-primary/20 hover:border-primary/40 hover:bg-primary/5"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="hover:bg-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="shadow-elegant border-muted">
          <CardContent className="text-center py-16">
            <div className="bg-muted/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
              <Search className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-xl font-semibold text-muted-foreground mb-2">ไม่พบข้อมูลค่าใช้จ่าย</p>
            <p className="text-muted-foreground">ลองเปลี่ยนคำค้นหาหรือเพิ่มข้อมูลใหม่</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="shadow-elegant border-primary/10">
          <CardContent className="py-6">
            <div className="flex justify-center items-center gap-4">
              <Button
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="border-primary/20 hover:border-primary/40"
              >
                ก่อนหน้า
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">หน้า</span>
                <span className="text-lg font-bold text-primary">{currentPage}</span>
                <span className="text-muted-foreground">จาก</span>
                <span className="text-lg font-bold text-primary">{totalPages}</span>
              </div>
              <Button
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="border-primary/20 hover:border-primary/40"
              >
                ถัดไป
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}