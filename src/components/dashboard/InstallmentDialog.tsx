import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Installment {
  installment_number: number;
  due_date: Date;
  amount: number;
  paid_amount: number;
  status: "pending" | "paid" | "partial";
}

interface InstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billTotal: number;
  onSuccess: () => void;
}

export function InstallmentDialog({ open, onOpenChange, billId, billTotal, onSuccess }: InstallmentDialogProps) {
  const [installments, setInstallments] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && billId) {
      loadInstallments();
    }
  }, [open, billId]);

  const loadInstallments = async () => {
    try {
      const { data, error } = await supabase
        .from("bill_installments")
        .select("*")
        .eq("bill_id", billId)
        .order("installment_number", { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        setInstallments(data.map((d: any) => ({
          installment_number: d.installment_number,
          due_date: new Date(d.due_date),
          amount: Number(d.amount),
          paid_amount: Number(d.paid_amount),
          status: d.status,
        })));
      } else {
        // เริ่มต้นด้วย 1 งวด
        setInstallments([{
          installment_number: 1,
          due_date: new Date(),
          amount: billTotal,
          paid_amount: 0,
          status: "pending",
        }]);
      }
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    }
  };

  const addInstallment = () => {
    const newNumber = installments.length + 1;
    // คำนวณยอดคงเหลือ = ยอดบิลทั้งหมด - ยอดที่ชำระไปแล้วทั้งหมด
    const totalPaid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
    const remainingAmount = billTotal - totalPaid;
    
    setInstallments([...installments, {
      installment_number: newNumber,
      due_date: new Date(),
      amount: remainingAmount > 0 ? remainingAmount : 0,
      paid_amount: 0,
      status: "pending",
    }]);
  };

  const removeInstallment = (index: number) => {
    if (installments.length === 1) {
      toast({ title: "ต้องมีอย่างน้อย 1 งวด", variant: "destructive" });
      return;
    }
    setInstallments(installments.filter((_, i) => i !== index));
  };

  const updateInstallment = (index: number, field: keyof Installment, value: any) => {
    const updated = [...installments];
    updated[index] = { ...updated[index], [field]: value };
    
    // อัปเดตสถานะอัตโนมัติ
    if (field === "paid_amount") {
      const paidAmount = Number(value);
      const amount = updated[index].amount;
      if (paidAmount >= amount) {
        updated[index].status = "paid";
      } else if (paidAmount > 0) {
        updated[index].status = "partial";
      } else {
        updated[index].status = "pending";
      }
    }
    
    setInstallments(updated);
  };

  const handleSave = async () => {
    // ตรวจสอบว่ายอดรวมของงวดตรงกับยอดบิลหรือไม่
    const totalInstallments = installments.reduce((sum, inst) => sum + Number(inst.amount), 0);
    if (Math.abs(totalInstallments - billTotal) > 0.01) {
      toast({ 
        title: "ยอดไม่ตรง", 
        description: `ยอดรวมของงวด (${totalInstallments}) ต้องเท่ากับยอดบิล (${billTotal})`,
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const ownerId = session?.session?.user.id;

      // ลบงวดเก่าออกก่อน
      await supabase.from("bill_installments").delete().eq("bill_id", billId);

      // เพิ่มงวดใหม่
      const installmentsToInsert = installments.map((inst, idx) => ({
        bill_id: billId,
        installment_number: idx + 1,
        due_date: inst.due_date.toISOString(),
        amount: Number(inst.amount),
        paid_amount: Number(inst.paid_amount),
        paid_date: inst.status === "paid" ? new Date().toISOString() : null,
        status: inst.status,
        owner_id: ownerId,
      }));

      const { error } = await supabase.from("bill_installments").insert(installmentsToInsert);
      if (error) throw error;

      // อัปเดตสถานะบิล
      const allPaid = installments.every(inst => inst.status === "paid");
      const anyPaid = installments.some(inst => inst.paid_amount > 0);
      
      let billStatus = "due";
      if (allPaid) {
        billStatus = "paid";
      } else if (anyPaid) {
        billStatus = "installment";
      }

      await supabase.from("bills").update({ status: billStatus }).eq("id", billId);

      toast({ title: "บันทึกสำเร็จ" });
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalPaid = installments.reduce((sum, inst) => sum + Number(inst.paid_amount), 0);
  const remaining = billTotal - totalPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>จัดการแบ่งชำระ</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* สรุปยอด */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">ยอดเต็ม</p>
              <p className="text-xl font-bold">฿{billTotal.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">ชำระแล้ว</p>
              <p className="text-xl font-bold text-[hsl(var(--positive))]">฿{totalPaid.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">คงเหลือ</p>
              <p className="text-xl font-bold text-destructive">฿{remaining.toLocaleString()}</p>
            </div>
          </div>

          {/* รายการงวด */}
          <div className="space-y-3">
            {installments.map((inst, idx) => (
              <div key={idx} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">งวดที่ {idx + 1}</h4>
                  {installments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeInstallment(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>วันที่ครบกำหนด</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(inst.due_date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={inst.due_date}
                          onSelect={(date) => date && updateInstallment(idx, "due_date", date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>ยอดคงเหลือ</Label>
                    <Input
                      type="number"
                      value={inst.amount}
                      onChange={(e) => updateInstallment(idx, "amount", Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>ชำระแล้ว</Label>
                    <Input
                      type="number"
                      value={inst.paid_amount}
                      onChange={(e) => updateInstallment(idx, "paid_amount", Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>สถานะ</Label>
                    <div className={cn(
                      "px-3 py-2 rounded-md text-sm font-medium",
                      inst.status === "paid" && "bg-[hsl(var(--positive))]/10 text-[hsl(var(--positive))]",
                      inst.status === "partial" && "bg-yellow-500/10 text-yellow-600",
                      inst.status === "pending" && "bg-muted text-muted-foreground"
                    )}>
                      {inst.status === "paid" && "ชำระแล้ว"}
                      {inst.status === "partial" && "ชำระบางส่วน"}
                      {inst.status === "pending" && "รอชำระ"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addInstallment} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มงวด
          </Button>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            ยกเลิก
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "กำลังบันทึก..." : "บันทึก"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
