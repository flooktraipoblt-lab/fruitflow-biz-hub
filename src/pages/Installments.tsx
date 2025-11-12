import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LoadingTable } from "@/components/common/LoadingTable";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "lucide-react";

interface InstallmentWithBill {
  id: string;
  bill_id: string;
  installment_number: number;
  due_date: string;
  amount: number;
  paid_amount: number;
  paid_date: string | null;
  status: "pending" | "partial" | "paid";
  bill_no: string;
  customer: string;
  bill_total: number;
}

export default function Installments() {
  const [installments, setInstallments] = useState<InstallmentWithBill[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const { toast } = useToast();

  useEffect(() => {
    loadInstallments();
  }, []);

  const loadInstallments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bill_installments")
        .select(`
          id,
          bill_id,
          installment_number,
          due_date,
          amount,
          paid_amount,
          paid_date,
          status,
          bills (
            bill_no,
            customer,
            total
          )
        `)
        .order("due_date", { ascending: false });

      if (error) throw error;

      const formatted = (data || []).map((item: any) => ({
        id: item.id,
        bill_id: item.bill_id,
        installment_number: item.installment_number,
        due_date: item.due_date,
        amount: item.amount,
        paid_amount: item.paid_amount,
        paid_date: item.paid_date,
        status: item.status,
        bill_no: item.bills?.bill_no || "-",
        customer: item.bills?.customer || "-",
        bill_total: item.bills?.total || 0,
      }));

      setInstallments(formatted);
    } catch (error: any) {
      toast({
        title: "เกิดข้อผิดพลาด",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-[hsl(var(--positive))]/10 text-[hsl(var(--positive))] hover:bg-[hsl(var(--positive))]/20">ชำระแล้ว</Badge>;
      case "partial":
        return <Badge className="bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20">ชำระบางส่วน</Badge>;
      case "pending":
        return <Badge variant="outline">รอชำระ</Badge>;
      default:
        return null;
    }
  };

  const filteredInstallments = installments.filter((inst) => {
    if (statusFilter === "all") return true;
    return inst.status === statusFilter;
  });

  // คำนวณสรุปยอด
  const totalAmount = filteredInstallments.reduce((sum, inst) => sum + inst.amount, 0);
  const totalPaid = filteredInstallments.reduce((sum, inst) => sum + inst.paid_amount, 0);
  const totalRemaining = totalAmount - totalPaid;

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>รายการงวดชำระ — Fruit Flow</title>
        <meta name="description" content="จัดการและติดตามงวดชำระทั้งหมด" />
      </Helmet>

      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">รายการงวดชำระ</h1>
          <p className="text-muted-foreground mt-1">จัดการและติดตามงวดชำระทั้งหมด</p>
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="กรองตามสถานะ" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">ทั้งหมด</SelectItem>
            <SelectItem value="pending">รอชำระ</SelectItem>
            <SelectItem value="partial">ชำระบางส่วน</SelectItem>
            <SelectItem value="paid">ชำระแล้ว</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* สรุปยอด */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ยอดเต็มทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{totalAmount.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">ชำระแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--positive))]">฿{totalPaid.toLocaleString()}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">คงเหลือ</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">฿{totalRemaining.toLocaleString()}</div>
          </CardContent>
        </Card>
      </div>

      {/* ตารางรายการงวด */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6">
              <LoadingTable columns={8} rows={5} />
            </div>
          ) : filteredInstallments.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-20" />
              <p>ไม่พบรายการงวดชำระ</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>เลขที่บิล</TableHead>
                    <TableHead>ลูกค้า</TableHead>
                    <TableHead>งวดที่</TableHead>
                    <TableHead>วันครบกำหนด</TableHead>
                    <TableHead className="text-right">ยอดงวด</TableHead>
                    <TableHead className="text-right">ชำระแล้ว</TableHead>
                    <TableHead className="text-right">คงเหลือ</TableHead>
                    <TableHead>สถานะ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInstallments.map((inst) => (
                    <TableRow key={inst.id}>
                      <TableCell className="font-medium">{inst.bill_no}</TableCell>
                      <TableCell>{inst.customer}</TableCell>
                      <TableCell>งวดที่ {inst.installment_number}</TableCell>
                      <TableCell>
                        {format(new Date(inst.due_date), "d MMM yyyy", { locale: th })}
                      </TableCell>
                      <TableCell className="text-right">฿{inst.amount.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-[hsl(var(--positive))]">
                        ฿{inst.paid_amount.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right text-destructive">
                        ฿{(inst.amount - inst.paid_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>{getStatusBadge(inst.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
