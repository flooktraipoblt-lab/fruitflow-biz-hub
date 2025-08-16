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
import { CalendarIcon, Plus, Edit, Trash2, ArrowLeft, User } from "lucide-react";
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

type AbsenceFormData = z.infer<typeof absenceSchema>;

export default function EmployeeProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { session, loading: authLoading } = useAuthData();
  const queryClient = useQueryClient();
  const [isAbsenceDialogOpen, setIsAbsenceDialogOpen] = useState(false);
  const [editingAbsence, setEditingAbsence] = useState<any>(null);

  const absenceForm = useForm<AbsenceFormData>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      date: new Date(),
      type: "leave",
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
        date: data.date.toISOString().split('T')[0],
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
          date: data.date.toISOString().split('T')[0],
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

  return (
    <div className="animate-fade-in min-h-screen bg-gradient-to-br from-background to-background/50 p-4">
      <Helmet>
        <title>{employee.name} | ข้อมูลพนักงาน</title>
        <meta name="description" content={`ข้อมูลและประวัติการทำงานของ ${employee.name}`} />
      </Helmet>

      <div className="container mx-auto max-w-6xl">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate("/employees")} className="mb-4">
            <ArrowLeft className="mr-2 h-4 w-4" />
            กลับ
          </Button>
          <div className="flex items-center gap-4 mb-4">
            <Avatar className="w-24 h-24">
              <AvatarImage src={employee.profile_image_url} alt={employee.name} />
              <AvatarFallback>
                <User className="w-12 h-12" />
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{employee.name}</h1>
              {employee.phone && (
                <p className="text-muted-foreground">{employee.phone}</p>
              )}
              <Badge variant={balance >= 0 ? "default" : "destructive"} className="mt-2">
                ยอดเงินคงเหลือ: ฿{balance.toLocaleString()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Employee Info */}
          <Card>
            <CardHeader>
              <CardTitle>ข้อมูลพนักงาน</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">วันที่เริ่มงาน</label>
                <p className="text-lg">{format(new Date(employee.start_date), "dd/MM/yyyy")}</p>
              </div>
              {employee.end_date && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">วันที่หยุดงาน</label>
                  <p className="text-lg">{format(new Date(employee.end_date), "dd/MM/yyyy")}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-muted-foreground">ค่าจ้างต่อวัน</label>
                <p className="text-lg">฿{parseFloat(employee.daily_rate.toString()).toLocaleString()}</p>
              </div>
              <Separator />
              <div>
                <label className="text-sm font-medium text-muted-foreground">วันลา</label>
                <p className="text-lg">{absences.filter(a => a.type === 'leave').length} วัน</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">วันทำงานครึ่งวัน</label>
                <p className="text-lg">{absences.filter(a => a.type === 'half_day').length} วัน</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">วันขาดงาน</label>
                <p className="text-lg">{absences.filter(a => a.type === 'absent').length} วัน</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">เงินที่เบิกไปแล้ว</label>
                <p className="text-lg">฿{withdrawals.reduce((sum, w) => sum + parseFloat(w.amount.toString()), 0).toLocaleString()}</p>
              </div>
            </CardContent>
          </Card>

          {/* Absence Management */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>จัดการการลา</CardTitle>
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
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {absences.map((absence) => (
                  <div key={absence.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{format(new Date(absence.date), "dd/MM/yyyy")}</p>
                      <Badge variant={getAbsenceTypeBadgeVariant(absence.type)} className="mt-1">
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
                        onClick={() => handleDeleteAbsence(absence.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                {absences.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">ไม่มีข้อมูลการลา</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Withdrawal History */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>ประวัติการเบิกเงิน</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {withdrawals.map((withdrawal) => (
                  <div key={withdrawal.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-medium">{format(new Date(withdrawal.date), "dd/MM/yyyy")}</p>
                      <Badge variant={withdrawal.type === 'cash' ? 'default' : 'secondary'} className="mt-1">
                        {withdrawal.type === 'cash' ? 'เงินสด' : 'โอน'}
                      </Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">
                        ฿{parseFloat(withdrawal.amount.toString()).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
                {withdrawals.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">ไม่มีประวัติการเบิกเงิน</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}