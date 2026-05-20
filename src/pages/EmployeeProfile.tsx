import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
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
import { CalendarIcon, Plus, Edit, Trash2, ArrowLeft, User, Wallet, CalendarDays, TrendingUp, TrendingDown, Phone, Briefcase, Banknote } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuthData } from "@/hooks/useAuthData";
import { Helmet } from "react-helmet-async";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const absenceSchema = z.object({
  date: z.date(),
  type: z.enum(["leave", "half_day", "absent"]),
});

const withdrawalSchema = z.object({
  date: z.date(),
  type: z.enum(["cash", "transfer"]),
  amount: z.union([z.number(), z.string()]).transform((val) =>
    typeof val === "string" ? (val === "" ? 0 : parseFloat(val)) : val
  ),
});

type AbsenceFormData = z.infer<typeof absenceSchema>;
type WithdrawalFormData = z.infer<typeof withdrawalSchema>;

// Format Date to YYYY-MM-DD in LOCAL timezone (avoids UTC shifting the day)
const toLocalDateString = (d: Date) => format(d, "yyyy-MM-dd");

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuthData();
  const queryClient = useQueryClient();
  const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<any>(null);
  const [isWithdrawalDialogOpen, setIsWithdrawalDialogOpen] = useState(false);
  const [editingWithdrawal, setEditingWithdrawal] = useState<any>(null);

  const absenceForm = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      date: new Date(),
      type: "leave",
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

  // Fetch employee
  const { data: employee, isLoading: employeeLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: async () => {
      if (!id) throw new Error("Employee ID is required");
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!session && !!id,
  });

  // Fetch withdrawals
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["employee-withdrawals", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_withdrawals")
        .select("*")
        .eq("employee_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session && !!id,
  });

  // Fetch absences
  const { data: absences = [] } = useQuery({
    queryKey: ["employee-absences", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_absences")
        .select("*")
        .eq("employee_id", id)
        .order("date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!session && !!id,
  });

  // Create absence mutation
  const createAbsenceMutation = useMutation({
    mutationFn: async (data: AbsenceFormData) => {
      if (!id) throw new Error("Employee ID is required");
      const { error } = await supabase.from("employee_absences").insert({
        employee_id: id,
        date: toLocalDateString(data.date),
        type: data.type,
        owner_id: session?.user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences", id] });
      toast({ title: "บันทึกการลาสำเร็จ" });
      absenceForm.reset();
      setIsAbsenceDialogOpen(false);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Update absence mutation
  const updateAbsenceMutation = useMutation({
    mutationFn: async (data: AbsenceFormData & { id: string }) => {
      const { error } = await supabase
        .from("employee_absences")
        .update({
          date: toLocalDateString(data.date),
          type: data.type,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences", id] });
      toast({ title: "แก้ไขการลาสำเร็จ" });
      setEditingAbsence(null);
      absenceForm.reset();
      setIsAbsenceDialogOpen(false);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Delete absence mutation
  const deleteAbsenceMutation = useMutation({
    mutationFn: async (absenceId: string) => {
      const { error } = await supabase
        .from("employee_absences")
        .delete()
        .eq("id", absenceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-absences", id] });
      toast({ title: "ลบการลาสำเร็จ" });
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Update withdrawal mutation
  const updateWithdrawalMutation = useMutation({
    mutationFn: async (data: WithdrawalFormData & { id: string }) => {
      const { error } = await supabase
        .from("employee_withdrawals")
        .update({
          date: data.date.toISOString(),
          type: data.type,
          amount: data.amount,
        })
        .eq("id", data.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-withdrawals", id] });
      toast({ title: "แก้ไขการเบิกเงินสำเร็จ" });
      setEditingWithdrawal(null);
      withdrawalForm.reset();
      setIsWithdrawalDialogOpen(false);
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Delete withdrawal mutation
  const deleteWithdrawalMutation = useMutation({
    mutationFn: async (withdrawalId: string) => {
      const { error } = await supabase
        .from("employee_withdrawals")
        .delete()
        .eq("id", withdrawalId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-withdrawals", id] });
      toast({ title: "ลบรายการเบิกเงินสำเร็จ" });
    },
    onError: () => {
      toast({ title: "เกิดข้อผิดพลาด", variant: "destructive" });
    },
  });

  // Calculate balance
  const calculateBalance = () => {
    if (!employee) return 0;
    
    const startDate = new Date(employee.start_date);
    const endDate = employee.end_date ? new Date(employee.end_date) : new Date();
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const absentDays = absences.filter(a => a.type === 'absent').length;
    const leaveDays = absences.filter(a => a.type === 'leave').length;
    const halfDays = absences.filter(a => a.type === 'half_day').length;
    
    const workingDays = totalDays - absentDays - leaveDays - (halfDays * 0.5);
    const totalEarning = workingDays * parseFloat(employee.daily_rate.toString());
    
    const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);
    
    return totalEarning - totalWithdrawn;
  };

  const getAbsenceTypeLabel = (type: string) => {
    switch (type) {
      case 'leave': return 'ลา';
      case 'half_day': return 'ทำงานครึ่งวัน';
      case 'absent': return 'ขาดงาน';
      default: return type;
    }
  };

  const getAbsenceTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'leave': return 'default';
      case 'half_day': return 'secondary';
      case 'absent': return 'destructive';
      default: return 'default';
    }
  };

  const handleSubmitAbsence = (data: AbsenceFormData) => {
    if (editingAbsence) {
      updateAbsenceMutation.mutate({ ...data, id: editingAbsence.id });
    } else {
      createAbsenceMutation.mutate(data);
    }
  };

  const handleEditAbsence = (absence: any) => {
    setEditingAbsence(absence);
    absenceForm.setValue("date", new Date(absence.date));
    absenceForm.setValue("type", absence.type);
    setIsAbsenceDialogOpen(true);
  };

  const handleDeleteAbsence = (absenceId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบการลานี้?")) {
      deleteAbsenceMutation.mutate(absenceId);
    }
  };

  const handleEditWithdrawal = (withdrawal: any) => {
    setEditingWithdrawal(withdrawal);
    withdrawalForm.setValue("date", new Date(withdrawal.date));
    withdrawalForm.setValue("type", withdrawal.type);
    withdrawalForm.setValue("amount", parseFloat(withdrawal.amount));
    setIsWithdrawalDialogOpen(true);
  };

  const handleDeleteWithdrawal = (withdrawalId: string) => {
    if (confirm("คุณแน่ใจหรือไม่ว่าต้องการลบรายการเบิกเงินนี้?")) {
      deleteWithdrawalMutation.mutate(withdrawalId);
    }
  };

  const handleSubmitWithdrawal = (data: WithdrawalFormData) => {
    if (editingWithdrawal) {
      updateWithdrawalMutation.mutate({ ...data, id: editingWithdrawal.id });
    }
  };

  if (authLoading || employeeLoading) {
    return <div className="flex justify-center items-center min-h-screen">กำลังโหลด...</div>;
  }

  if (!session) {
    return <div className="flex justify-center items-center min-h-screen">กรุณาเข้าสู่ระบบ</div>;
  }

  if (!employee) {
    return <div className="flex justify-center items-center min-h-screen">ไม่พบข้อมูลพนักงาน</div>;
  }

  const balance = calculateBalance();
  const totalWithdrawn = withdrawals.reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0);
  const leaveDays = absences.filter(a => a.type === 'leave').length;
  const halfDays = absences.filter(a => a.type === 'half_day').length;
  const absentDays = absences.filter(a => a.type === 'absent').length;

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 md:p-6">
      <Helmet>
        <title>{employee.name} | ข้อมูลพนักงาน</title>
        <meta name="description" content={`ข้อมูลและประวัติการทำงานของ ${employee.name}`} />
      </Helmet>

      <div className="container mx-auto max-w-6xl">
        <Button variant="ghost" onClick={() => navigate("/employees")} className="mb-4 hover:bg-muted/60">
          <ArrowLeft className="mr-2 h-4 w-4" />
          กลับ
        </Button>

        {/* Hero Profile Header */}
        <Card className="mb-6 overflow-hidden border-0 shadow-lg">
          <div className="h-28 bg-gradient-to-r from-primary/80 via-primary to-primary/60" />
          <CardContent className="relative pt-0 pb-6">
            <div className="-mt-14">
              <Avatar className="w-28 h-28 ring-4 ring-background shadow-xl">
                <AvatarImage src={employee.profile_image_url} alt={employee.name} />
                <AvatarFallback className="bg-muted">
                  <User className="w-14 h-14 text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
              <div className="mt-4">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{employee.name}</h1>
                <div className="flex flex-wrap items-center gap-3 mt-2 text-sm text-muted-foreground">
                  {employee.phone && (
                    <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" />{employee.phone}</span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Briefcase className="h-3.5 w-3.5" />
                    เริ่มงาน {format(new Date(employee.start_date), "dd/MM/yyyy")}
                  </span>
                  {employee.end_date ? (
                    <Badge variant="secondary">หยุดงานแล้ว</Badge>
                  ) : (
                    <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-400 border-0">กำลังทำงาน</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stat Cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">ยอดคงเหลือ</span>
                <Wallet className="h-4 w-4 text-primary" />
              </div>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-foreground' : 'text-destructive'}`}>
                ฿{balance.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">ค่าจ้าง/วัน</span>
                <Banknote className="h-4 w-4 text-emerald-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                ฿{parseFloat(employee.daily_rate.toString()).toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">เบิกไปแล้ว</span>
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">฿{totalWithdrawn.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">ขาด/ลา/ครึ่ง</span>
                <CalendarDays className="h-4 w-4 text-blue-500" />
              </div>
              <p className="text-2xl font-bold text-foreground">
                {absentDays}<span className="text-muted-foreground text-base">/</span>{leaveDays}<span className="text-muted-foreground text-base">/</span>{halfDays}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Employee Info */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2"><User className="h-4 w-4" />ข้อมูลพนักงาน</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">วันที่เริ่มงาน</span>
                <span className="font-medium">{format(new Date(employee.start_date), "dd/MM/yyyy")}</span>
              </div>
              {employee.end_date && (
                <div className="flex justify-between items-center py-2 border-b border-dashed">
                  <span className="text-sm text-muted-foreground">วันที่หยุดงาน</span>
                  <span className="font-medium">{format(new Date(employee.end_date), "dd/MM/yyyy")}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">วันลา</span>
                <Badge variant="outline">{leaveDays} วัน</Badge>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-dashed">
                <span className="text-sm text-muted-foreground">ทำงานครึ่งวัน</span>
                <Badge variant="outline">{halfDays} วัน</Badge>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-muted-foreground">ขาดงาน</span>
                <Badge variant="outline" className="border-destructive/40 text-destructive">{absentDays} วัน</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Absence Management */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30 space-y-0">
              <CardTitle className="text-base flex items-center gap-2"><CalendarDays className="h-4 w-4" />จัดการการลา</CardTitle>
              <Dialog open={isAbsenceDialogOpen} onOpenChange={setIsAbsenceDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" onClick={() => { setEditingAbsence(null); absenceForm.reset(); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    เพิ่มการลา
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingAbsence ? "แก้ไขการลา" : "เพิ่มการลา"}</DialogTitle>
                  </DialogHeader>
                  <Form {...absenceForm}>
                    <form onSubmit={absenceForm.handleSubmit(handleSubmitAbsence)} className="space-y-4">
                      <FormField
                        control={absenceForm.control}
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
                        control={absenceForm.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>ประเภท</FormLabel>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger>
                                <SelectValue placeholder="เลือกประเภท" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="leave">ลา</SelectItem>
                                <SelectItem value="half_day">ทำงานครึ่งวัน</SelectItem>
                                <SelectItem value="absent">ขาดงาน</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setIsAbsenceDialogOpen(false)}>
                          ยกเลิก
                        </Button>
                        <Button type="submit">
                          {editingAbsence ? "บันทึกการแก้ไข" : "บันทึก"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {absences.map((absence) => (
                  <div key={absence.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors">
                    <div>
                      <p className="font-medium text-sm">{format(new Date(absence.date), "dd/MM/yyyy")}</p>
                      <Badge variant={getAbsenceTypeBadgeVariant(absence.type)} className="mt-1 text-xs">
                        {getAbsenceTypeLabel(absence.type)}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditAbsence(absence)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteAbsence(absence.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {absences.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">ไม่มีข้อมูลการลา</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card className="md:col-span-2 border-0 shadow-sm">
            <CardHeader className="border-b bg-muted/30">
              <CardTitle className="text-base flex items-center gap-2"><Wallet className="h-4 w-4" />ประวัติการเบิกเงิน</CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid gap-2 max-h-96 overflow-y-auto pr-1">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/60 transition-colors gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{format(new Date(withdrawal.date), "dd/MM/yyyy")}</p>
                      <Badge variant={withdrawal.type === 'cash' ? 'default' : 'secondary'} className="mt-1 text-xs">
                        {withdrawal.type === 'cash' ? 'เงินสด' : 'โอน'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ฿{parseFloat(withdrawal.amount.toString()).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEditWithdrawal(withdrawal)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDeleteWithdrawal(withdrawal.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {withdrawals.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">ไม่มีประวัติการเบิกเงิน</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Edit Withdrawal Dialog */}
        <Dialog open={isWithdrawalDialogOpen} onOpenChange={(open) => {
          setIsWithdrawalDialogOpen(open);
          if (!open) { setEditingWithdrawal(null); withdrawalForm.reset(); }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>แก้ไขรายการเบิกเงิน</DialogTitle>
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
                          <Calendar mode="single" selected={field.value} onSelect={field.onChange} className="pointer-events-auto" />
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
                        <SelectTrigger><SelectValue placeholder="เลือกประเภท" /></SelectTrigger>
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
                        <Input type="number" step="0.01" {...field} value={field.value as any} onChange={(e) => field.onChange(e.target.value)} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsWithdrawalDialogOpen(false)}>ยกเลิก</Button>
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