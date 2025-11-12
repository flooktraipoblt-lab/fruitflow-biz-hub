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
import { Textarea } from "@/components/ui/textarea";

interface Payment {
  id?: string;
  payment_date: Date;
  amount: number;
  note?: string;
}

interface InstallmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billId: string;
  billTotal: number;
  onSuccess: () => void;
}

export function InstallmentDialog({ open, onOpenChange, billId, billTotal, onSuccess }: InstallmentDialogProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open && billId) {
      loadPayments();
    }
  }, [open, billId]);

  const loadPayments = async () => {
    try {
      const { data, error } = await supabase
        .from("bill_payments")
        .select("*")
        .eq("bill_id", billId)
        .order("payment_date", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        setPayments(data.map((d: any) => ({
          id: d.id,
          payment_date: new Date(d.payment_date),
          amount: Number(d.amount),
          note: d.note || "",
        })));
      } else {
        // เริ่มต้นด้วยการชำระครั้งแรก
        setPayments([{
          payment_date: new Date(),
          amount: 0,
          note: "",
        }]);
      }
    } catch (error: any) {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    }
  };

  const addPayment = () => {
    setPayments([...payments, {
      payment_date: new Date(),
      amount: 0,
      note: "",
    }]);
  };

  const removePayment = (index: number) => {
    if (payments.length === 1) {
      toast({ title: "ต้องมีอย่างน้อย 1 รายการ", variant: "destructive" });
      return;
    }
    setPayments(payments.filter((_, i) => i !== index));
  };

  const updatePayment = (index: number, field: keyof Payment, value: any) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], [field]: value };
    setPayments(updated);
  };

  const handleSave = async () => {
    // ตรวจสอบไม่ให้ยอดชำระรวมเกินยอดบิล
    const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
    if (totalPaid - billTotal > 0.01) {
      toast({
        title: "ยอดชำระเกิน",
        description: `ยอดชำระรวม (${totalPaid.toLocaleString()}) ต้องไม่เกินยอดบิล (${billTotal.toLocaleString()})`,
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: session } = await supabase.auth.getSession();
      const ownerId = session?.session?.user.id;

      // ลบการชำระเงินเก่าออกก่อน
      await supabase.from("bill_payments").delete().eq("bill_id", billId);

      // เพิ่มการชำระเงินใหม่
      const paymentsToInsert = payments
        .filter(p => p.amount > 0) // เฉพาะที่มียอดชำระ
        .map((payment) => ({
          bill_id: billId,
          payment_date: payment.payment_date.toISOString(),
          amount: Number(payment.amount),
          note: payment.note || null,
          owner_id: ownerId,
        }));

      if (paymentsToInsert.length > 0) {
        const { error } = await supabase.from("bill_payments").insert(paymentsToInsert);
        if (error) throw error;
      }

      // อัปเดตสถานะบิล
      let billStatus = "due";
      if (totalPaid >= billTotal) {
        billStatus = "paid";
      } else if (totalPaid > 0) {
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

  const totalPaid = payments.reduce((sum, payment) => sum + Number(payment.amount), 0);
  const remaining = billTotal - totalPaid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>ประวัติการชำระเงิน</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* สรุปยอด */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">ยอดบิล</p>
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

          {/* รายการชำระเงิน */}
          <div className="space-y-3">
            {payments.map((payment, idx) => (
              <div key={idx} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">การชำระครั้งที่ {idx + 1}</h4>
                  {payments.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePayment(idx)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>วันที่ชำระ</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start">
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(payment.payment_date, "dd/MM/yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={payment.payment_date}
                          onSelect={(date) => date && updatePayment(idx, "payment_date", date)}
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div className="space-y-2">
                    <Label>จำนวนเงิน (฿)</Label>
                    <Input
                      type="number"
                      value={payment.amount}
                      onChange={(e) => updatePayment(idx, "amount", Number(e.target.value))}
                      placeholder="0"
                    />
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>หมายเหตุ (ถ้ามี)</Label>
                    <Textarea
                      value={payment.note || ""}
                      onChange={(e) => updatePayment(idx, "note", e.target.value)}
                      placeholder="เช่น โอนเงิน, เงินสด"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" onClick={addPayment} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            เพิ่มการชำระเงิน
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
