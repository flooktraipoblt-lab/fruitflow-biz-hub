import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, Users, Clock, Briefcase } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function AttendanceShortcuts() {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: employees = [] } = useQuery({
    queryKey: ["employees-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name")
        .is("end_date", null);
      if (error) throw error;
      return data;
    },
  });

  const markAttendanceMutation = useMutation({
    mutationFn: async ({ type }: { type: "work" | "holiday" | "half" }) => {
      const date = format(selectedDate, "yyyy-MM-dd");
      
      // Delete existing absences for this date for all employees
      const { error: deleteError } = await supabase
        .from("employee_absences")
        .delete()
        .eq("date", date);
      
      if (deleteError) throw deleteError;

      // If holiday, insert absences for all employees
      if (type === "holiday") {
        const { data: { user } } = await supabase.auth.getUser();
        const absences = employees.map((emp: any) => ({
          employee_id: emp.id,
          date: date,
          type: "holiday",
          owner_id: user?.id,
        }));
        
        if (absences.length > 0) {
          const { error } = await supabase
            .from("employee_absences")
            .insert(absences);
          if (error) throw error;
        }
      } else if (type === "half") {
        const { data: { user } } = await supabase.auth.getUser();
        const absences = employees.map((emp: any) => ({
          employee_id: emp.id,
          date: date,
          type: "half-day",
          owner_id: user?.id,
        }));
        
        if (absences.length > 0) {
          const { error } = await supabase
            .from("employee_absences")
            .insert(absences);
          if (error) throw error;
        }
      }
      // If "work", we just deleted absences, so nothing more to do
    },
    onSuccess: (_, { type }) => {
      queryClient.invalidateQueries({ queryKey: ["employee_absences"] });
      const messages = {
        work: "บันทึกวันทำงานปกติสำหรับพนักงานทุกคน",
        holiday: "บันทึกวันหยุดสำหรับพนักงานทุกคน",
        half: "บันทึกทำงานครึ่งวันสำหรับพนักงานทุกคน",
      };
      toast({ title: "สำเร็จ", description: messages[type] });
      setIsDialogOpen(false);
    },
    onError: (error) => {
      toast({ title: "ผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Users className="h-4 w-4" />
          บันทึกการทำงานพนักงาน
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>บันทึกการทำงานพนักงานทุกคน</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">เลือกวันที่</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(selectedDate, "PPP", { locale: th })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ประเภทการทำงาน</label>
            <div className="grid gap-2">
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => markAttendanceMutation.mutate({ type: "work" })}
                disabled={markAttendanceMutation.isPending}
              >
                <Briefcase className="h-4 w-4" />
                วันทำงานปกติ
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => markAttendanceMutation.mutate({ type: "holiday" })}
                disabled={markAttendanceMutation.isPending}
              >
                <CalendarIcon className="h-4 w-4" />
                วันหยุด
              </Button>
              <Button
                variant="outline"
                className="justify-start gap-2"
                onClick={() => markAttendanceMutation.mutate({ type: "half" })}
                disabled={markAttendanceMutation.isPending}
              >
                <Clock className="h-4 w-4" />
                ทำงานครึ่งวัน
              </Button>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            พนักงานทั้งหมด: {employees.length} คน
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
