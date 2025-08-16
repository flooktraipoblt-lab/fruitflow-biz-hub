import { useState } from "react";
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
import { CalendarIcon, Plus, Eye, Edit, Trash2, DollarSign, Search, User } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuthData } from "@/hooks/useAuthData";
import { Helmet } from "react-helmet-async";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

const employeeSchema = z.object({
  name: z.string().min(1, "ชื่อจำเป็นต้องระบุ"),
  phone: z.string().optional(),
  start_date: z.date(),
  daily_rate: z.number().min(0, "ค่าจ้างต้องมากกว่าหรือเท่ากับ 0"),
  profile_image_url: z.string().optional(),
});

const withdrawalSchema = z.object({
  date: z.date(),
  type: z.enum(["cash", "transfer"]),
  amount: z.number().min(0, "จำนวนเงินต้องมากกว่าหรือเท่ากับ 0"),
});

type EmployeeFormData = z.infer<typeof employeeSchema>;
type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

export default function Employees() {
  const { session, loading: authLoading } = useAuthData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [isEmployeeDialogOpen, setIsEmployeeDialogOpen] = useState(false);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);

  const employeeForm = useForm<EmployeeFormData>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      name: "",
      phone: "",
      start_date: new Date(),
      daily_rate: 0,
      profile_image_url: "",
    },
  });

  const withdrawalForm = useForm<WithdrawalFormData>({
    resolver: zodResolver(withdrawalSchema),
    defaultValues: {
      date: new Date(),
      type: "cash",
      amount: 0,
    },
  });

  // Fetch employees
  const { data: employees = [], isLoading: employeesLoading } = useQuery({
    queryKey: ["employees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch withdrawals
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["employee-withdrawals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_withdrawals")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Fetch absences
  const { data: absences = [] } = useQuery({
    queryKey: ["employee-absences"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_absences")
        .select("*")
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session,
  });

  // Create employee mutation
  const createEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData) => {
      const { error } = await supabase.from("employees").insert({
        name: data.name,
        phone: data.phone,
        start_date: data.start_date.toISOString().split('T')[0],
        daily_rate: data.daily_rate,
        profile_image_url: data.profile_image_url,
        owner_id: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "เพิ่มพนักงานสำเร็จ" });
      employeeForm.reset();
      setIsEmployeeDialogOpen(false);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Update employee mutation
  const updateEmployeeMutation = useMutation({
    mutationFn: async (data: EmployeeFormData & { id: string }) => {
      const { error } = await supabase
        .from("employees")
        .update({
          name: data.name,
          phone: data.phone,
          start_date: data.start_date.toISOString().split('T')[0],
          daily_rate: data.daily_rate,
          profile_image_url: data.profile_image_url,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "แก้ไขข้อมูลพนักงานสำเร็จ" });
      setEditingEmployee(null);
      employeeForm.reset();
      setIsEmployeeDialogOpen(false);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Delete employee mutation
  const deleteEmployeeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("employees").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast({ title: "ลบพนักงานสำเร็จ" });
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Create withdrawal mutation
  const createWithdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData & { employee_id: string }) => {
      const { error } = await supabase.from("employee_withdrawals").insert({
        employee_id: data.employee_id,
        date: data.date.toISOString(),
        type: data.type,
        amount: data.amount,
        owner_id: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-withdrawals"] });
      toast({ title: "บันทึกการเบิกเงินสำเร็จ" });
      withdrawalForm.reset();
      setIsWithdrawalDialogOpen(false);
      setSelectedEmployee(null);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Filter employees
  const filteredEmployees = employees.filter((employee) =>
    employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (employee.phone && employee.phone.includes(searchTerm))
  );

  // Calculate employee balance
  const calculateBalance = (employee: any) => {
    const startDate = new Date(employee.start_date);
    const endDate = employee.end_date ? new Date(employee.end_date) : new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const employeeAbsences = absences.filter(a => a.employee_id === employee.id);
    const absentDays = employeeAbsences.filter(a => a.type === 'absent').length;
    const leaveDays = employeeAbsences.filter(a => a.type === 'leave').length;
    const halfDays = employeeAbsences.filter(a => a.type === 'half_day').length;
    
    const workingDays = totalDays - absentDays - leaveDays - (halfDays * 0.5);
    const totalEarning = workingDays * parseFloat(employee.daily_rate.toString());
    
    const employeeWithdrawals = withdrawals.filter(w => w.employee_id === employee.id);
    const totalWithdrawn = employeeWithdrawals.reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);
    
    return totalEarning - totalWithdrawn;
  };

  const handleSubmitEmployee = (data: EmployeeFormData) => {
    if (editingEmployee) {
      updateEmployeeMutation.mutate({ ...data, id: editingEmployee.id });
    } else {
      createEmployeeMutation.mutate(data);
    }
  };

  const handleEditEmployee = (employee: any) => {
    setEditingEmployee(employee);
    employeeForm.setValue("name", employee.name);
    employeeForm.setValue("phone", employee.phone || "");
    employeeForm.setValue("start_date", new Date(employee.start_date));
    employeeForm.setValue("daily_rate", parseFloat(employee.daily_rate));
    employeeForm.setValue("profile_image_url", employee.profile_image_url || "");
    setIsEmployeeDialogOpen(true);
  };

  const handleDeleteEmployee = (id: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบพนักงานคนนี้?")) {
      deleteEmployeeMutation.mutate(id);
    }
  };

  const handleWithdrawMoney = (employee: any) => {
    setSelectedEmployee(employee);
    setIsWithdrawalDialogOpen(true);
  };

  const handleSubmitWithdrawal = (data: WithdrawalFormData) => {
    if (selectedEmployee) {
      createWithdrawalMutation.mutate({ ...data, employee_id: selectedEmployee.id });
    }
  };

  const handleViewProfile = (employee: any) => {
    navigate(`/employee-profile/${employee.id}`);
  };

  if (authLoading || employeesLoading) {
    return <div className="flex justify-center items-center min-h-screen">กำลังโหลด...</div>;
  }

  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">กรุณาเข้าสู่ระบบ</div>;
  }

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-background to-background/50 p-4">
      <Helmet>
        <title>พนักงาน | ระบบจัดการร้านค้า</title>
        <meta name="description" content="จัดการข้อมูลพนักงาน การเบิกเงิน และการคำนวณเงินเดือน" />
      </Helmet>

      <div className="container mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">พนักงาน</h1>
          <p className="text-muted-foreground">จัดการข้อมูลพนักงานและการเบิกเงิน</p>
        </div>

        {/* Search and Add Employee */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="ค้นหาพนักงาน..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Dialog open={isEmployeeDialogOpen} onOpenChange={setIsEmployeeDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => { setEditingEmployee(null); employeeForm.reset(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มพนักงาน
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingEmployee ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงาน"}</DialogTitle>
                  </DialogHeader>
                  <Form {...employeeForm}>
                    <form onSubmit={employeeForm.handleSubmit(handleSubmitEmployee)} className="space-y-4">
                      <FormField
                        control={employeeForm.control}
                        name="profile_image_url"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>รูปโปรไฟล์ (URL)</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="URL รูปโปรไฟล์" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={employeeForm.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ชื่อ</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="ชื่อพนักงาน" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={employeeForm.control}
                        name="phone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>เบอร์โทร</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="เบอร์โทรศัพท์" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={employeeForm.control}
                        name="start_date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>วันที่เริ่มงาน</FormLabel>
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
                        control={employeeForm.control}
                        name="daily_rate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ค่าจ้างต่อวัน</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                placeholder="ค่าจ้างต่อวัน"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsEmployeeDialogOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button type="submit">
                          {editingEmployee ? "บันทึกการแก้ไข" : "บันทึก"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Employees Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEmployees.map((employee) => {
            const balance = calculateBalance(employee);
            return (
              <Card key={employee.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="text-center pb-4">
                  <Avatar className="w-20 h-20 mx-auto mb-4">
                    <AvatarImage src={employee.profile_image_url} alt={employee.name} />
                    <AvatarFallback>
                      <User className="w-10 h-10" />
                    </AvatarFallback>
                  </Avatar>
                  <CardTitle className="text-lg">{employee.name}</CardTitle>
                  {employee.phone && (
                    <p className="text-sm text-muted-foreground">{employee.phone}</p>
                  )}
                  <Badge variant={balance >= 0 ? "default" : "destructive"} className="mx-auto">
                    ยอดคงเหลือ: ฿{balance.toLocaleString()}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-muted-foreground mb-4">
                    <p>เริ่มงาน: {format(new Date(employee.start_date), "dd/MM/yyyy")}</p>
                    <p>ค่าจ้าง: ฿{parseFloat(employee.daily_rate.toString()).toLocaleString()}/วัน</p>
                  </div>
                  <div className="flex justify-between gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleWithdrawMoney(employee)}
                      className="flex-1"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      เบิกเงิน
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleViewProfile(employee)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEditEmployee(employee)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteEmployee(employee.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEmployees.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">ไม่พบข้อมูลพนักงาน</p>
            </CardContent>
          </Card>
        )}

        {/* Withdrawal Dialog */}
        <Dialog open={isWithdrawalDialogOpen} onOpenChange={setIsWithdrawalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>เบิกเงิน - {selectedEmployee?.name}</DialogTitle>
            </DialogHeader>
            <Form {...withdrawalForm}>
              <form onSubmit={withdrawalForm.handleSubmit(handleSubmitWithdrawal)} className="space-y-4">
                <FormField
                  control={withdrawalForm.control}
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
                  control={withdrawalForm.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ประเภท</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกประเภท" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="cash">เงินสด</SelectItem>
                          <SelectItem value="transfer">โอน</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={withdrawalForm.control}
                  name="amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>จำนวนเงิน</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          {...field}
                          onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                          placeholder="จำนวนเงิน"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsWithdrawalDialogOpen(false)}>
                    ยกเลิก
                  </Button>
                  <Button type="submit">บันทึก</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}