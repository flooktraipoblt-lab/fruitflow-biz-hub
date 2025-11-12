import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarIcon, Printer, Pencil, Trash2, MessageCircle } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate, useSearchParams } from "react-router-dom";
import { FilteredExportButton } from "@/components/common/FilteredExportButton";
import { LoadingTable } from "@/components/common/LoadingTable";
import { useAuthData } from "@/hooks/useAuthData";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import html2canvas from "html2canvas";
import { InstallmentDialog } from "@/components/dashboard/InstallmentDialog";

interface BillRow {
  id: string;
  date: Date;
  type: "buy" | "sell";
  customer: string;
  total: number;
  status: "paid" | "due" | "installment";
}

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

export default function Bills() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "buy" | "sell">("all");
  const [status, setStatus] = useState<"all" | "paid" | "due" | "installment">("all");
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [updateStatusData, setUpdateStatusData] = useState<{ id: string; status: "paid" | "due" } | null>(null);
  const [installmentBill, setInstallmentBill] = useState<{ id: string; total: number } | null>(null);
  const [installmentStatusFilter, setInstallmentStatusFilter] = useState<string>("all");
  const { toast } = useToast();
  const navigate = useNavigate();
  const { session } = useAuthData();

  const [custSuggestions, setCustSuggestions] = useState<string[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);

  // อ่าน query parameter และตั้งค่า filter เริ่มต้น
  useEffect(() => {
    const statusParam = searchParams.get("status");
    if (statusParam === "paid" || statusParam === "due") {
      setStatus(statusParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!q || q.trim().length < 1) {
      setCustSuggestions([]);
      setItemSuggestions([]);
      return;
    }
    const fetchSug = async () => {
      try {
        const [custRes, itemRes] = await Promise.all([
          (supabase as any).from("customers").select("name").ilike("name", `%${q}%`).limit(5),
          (supabase as any).from("bill_items").select("name").ilike("name", `%${q}%`).limit(5),
        ]);
        setCustSuggestions(Array.from(new Set(((custRes as any).data ?? []).map((r: any) => r.name).filter(Boolean))));
        setItemSuggestions(Array.from(new Set(((itemRes as any).data ?? []).map((r: any) => r.name).filter(Boolean))));
      } catch {}
    };
    fetchSug();
  }, [q]);

  const { data: rows = [], isLoading, refetch } = useQuery({
    queryKey: ["bills"],
    queryFn: async (): Promise<BillRow[]> => {
      const { data, error } = await (supabase as any)
        .from("bills")
        .select("*")
        .order("bill_date", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((d: any) => ({
        id: d.id,
        date: new Date(d.bill_date),
        type: (d.type as "buy" | "sell") ?? "sell",
        customer: d.customer ?? "",
        total: Number(d.total ?? 0),
        status: (d.status as "paid" | "due") ?? "due",
      }));
    },
  });

  const { data: installments = [], isLoading: installmentsLoading, refetch: refetchInstallments } = useQuery({
    queryKey: ["installments"],
    queryFn: async (): Promise<InstallmentWithBill[]> => {
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

      return (data || []).map((item: any) => ({
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
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // ลบจาก Supabase ก่อน
      const { error } = await (supabase as any).from("bills").delete().eq("id", id);
      if (error) throw error;

      // ส่งข้อมูลไปยัง n8n webhook (ไม่ให้ fail webhook ส่งผลต่อการลบ)
      try {
        await fetch("https://n8n.srv982532.hstgr.cloud/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bill_id: id,
            action: "delete",
            timestamp: new Date().toISOString()
          }),
        });
      } catch (webhookError) {
        // ไม่ให้ webhook error ส่งผลต่อการลบ
        console.warn("Webhook failed but deletion succeeded:", webhookError);
      }
    },
    onSuccess: () => {
      toast({ title: "ลบสำเร็จ" });
      setDeleteId(null);
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "ลบไม่สำเร็จ", description: err.message, variant: "destructive" });
      setDeleteId(null);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (payload: { id: string; status: "paid" | "due" }) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({ status: payload.status })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "อัปเดตสถานะสำเร็จ" });
      setUpdateStatusData(null);
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "อัปเดตสถานะไม่สำเร็จ", description: err.message, variant: "destructive" });
      setUpdateStatusData(null);
    },
  });

  const handleShareToLine = async (billId: string) => {
    try {
      toast({ title: "กำลังเตรียมรูปภาพ..." });

      // Fetch bill data
      const { data: bill, error: billError } = await (supabase as any)
        .from("bills")
        .select("*")
        .eq("id", billId)
        .single();

      if (billError) throw billError;
      if (!bill) throw new Error("ไม่พบข้อมูลบิล");

      // Open print page in new window to capture
      const printUrl = `${window.location.origin}/print/${billId}`;
      const captureWindow = window.open(printUrl, '_blank', 'width=800,height=600');
      
      if (!captureWindow) {
        toast({ title: "กรุณาอนุญาตให้เปิดหน้าต่างใหม่ในการตั้งค่าเบราว์เซอร์", variant: "destructive" });
        return;
      }

      // Wait for the print page to load
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Capture bill as image
      const billElement = captureWindow.document.querySelector('.bill-content') as HTMLElement;
      if (!billElement) {
        captureWindow.close();
        throw new Error('ไม่พบเนื้อหาบิล');
      }

      const canvas = await html2canvas(billElement, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
      });

      // Close the capture window
      captureWindow.close();

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error('Failed to create image'));
        }, 'image/png', 1.0);
      });

      // Create download link for the image
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bill-${bill.bill_no}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Save share data
      await supabase.from('bill_shares').insert({
        bill_id: bill.id,
        bill_no: bill.bill_no,
        customer_name: bill.customer,
        bill_type: bill.type,
        total_amount: bill.total,
        bill_date: bill.bill_date,
        shared_at: new Date().toISOString(),
        owner_id: session?.user.id,
      });

      const billType = bill.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย';
      toast({ 
        title: "ดาวน์โหลดสำเร็จ", 
        description: `รูปบิลถูกดาวน์โหลดแล้ว คุณสามารถแชร์ไป Line ได้เลย\nวันที่: ${format(new Date(bill.bill_date), "dd/MM/yyyy")}\nลูกค้า: ${bill.customer}\nประเภท: ${billType}`
      });
    } catch (error) {
      console.error('Error sharing to Line:', error);
      toast({ title: "เกิดข้อผิดพลาดในการสร้างรูปภาพ", variant: "destructive" });
    }
  };

  const filtered = useMemo(() => rows.filter((r) => {
    if (q && !`${r.customer}`.includes(q)) return false;
    if (type !== "all" && r.type !== type) return false;
    if (status !== "all" && r.status !== status) return false;
    if (range.from && r.date < range.from) return false;
    if (range.to && r.date > range.to) return false;
    return true;
  }), [rows, q, type, status, range]);

  const stats = useMemo(() => {
    const totalBills = filtered.length;
    const totalAmount = filtered.reduce((sum, bill) => sum + bill.total, 0);
    const dueBills = filtered.filter(bill => bill.status === "due").length;
    const dueAmount = filtered.filter(bill => bill.status === "due").reduce((sum, bill) => sum + bill.total, 0);
    const paidBills = filtered.filter(bill => bill.status === "paid").length;
    const paidAmount = filtered.filter(bill => bill.status === "paid").reduce((sum, bill) => sum + bill.total, 0);
    
    return { totalBills, totalAmount, dueBills, dueAmount, paidBills, paidAmount };
  }, [filtered]);

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

  const filteredInstallments = useMemo(() => {
    return installments.filter((inst) => {
      if (installmentStatusFilter === "all") return true;
      return inst.status === installmentStatusFilter;
    });
  }, [installments, installmentStatusFilter]);

  const installmentStats = useMemo(() => {
    const totalAmount = filteredInstallments.reduce((sum, inst) => sum + inst.amount, 0);
    const totalPaid = filteredInstallments.reduce((sum, inst) => sum + inst.paid_amount, 0);
    const totalRemaining = totalAmount - totalPaid;
    return { totalAmount, totalPaid, totalRemaining };
  }, [filteredInstallments]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>รายการบิล | Fruit Flow</title>
        <meta name="description" content="ดู ค้นหา และจัดการบิลที่บันทึกแล้ว พร้อมตัวกรองอัจฉริยะ" />
        <link rel="canonical" href={`${window.location.origin}/bills`} />
      </Helmet>

      <h1 className="text-2xl font-bold">รายการบิล</h1>

      <Tabs defaultValue="bills" className="space-y-6">
        <TabsList>
          <TabsTrigger value="bills">บิลล่าสุด</TabsTrigger>
          <TabsTrigger value="installments">แบ่งชำระ</TabsTrigger>
        </TabsList>

        <TabsContent value="bills" className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">จำนวนบิลทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBills}</div>
            <p className="text-xs text-muted-foreground mt-1">บิลที่กรองแล้ว</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">ยอดรวมทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">฿{stats.totalAmount.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">ยอดรวมทั้งหมด</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">บิลค้างจ่าย</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.dueBills}</div>
            <p className="text-xs text-muted-foreground mt-1">฿{stats.dueAmount.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">บิลชำระแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[hsl(var(--positive))]">{stats.paidBills}</div>
            <p className="text-xs text-muted-foreground mt-1">฿{stats.paidAmount.toLocaleString()}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>ตัวกรอง</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5 items-end">
          <div className="grid gap-2 relative">
            <Label>ค้นหา</Label>
            <Input
              placeholder="ค้นหาชื่อลูกค้า..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onFocus={() => setShowSug(true)}
              onBlur={() => setTimeout(() => setShowSug(false), 120)}
            />
            {showSug && (custSuggestions.length > 0 || itemSuggestions.length > 0) && (
              <div className="absolute top-full mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow z-50">
                {custSuggestions.length > 0 && (
                  <div className="py-1">
                    <div className="px-3 py-1 text-xs opacity-70">ลูกค้า</div>
                    {custSuggestions.map((s) => (
                      <button
                        key={s}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-muted/50"
                        onMouseDown={(e) => { e.preventDefault(); setQ(s); setShowSug(false); }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
                {itemSuggestions.length > 0 && (
                  <div className="py-1 border-t">
                    <div className="px-3 py-1 text-xs opacity-70">สินค้า</div>
                    {itemSuggestions.map((s) => (
                      <div key={s} className="px-3 py-2 text-sm">{s}</div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="grid gap-2">
            <Label>ประเภทบิล</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="buy">บิลซื้อ</SelectItem>
                <SelectItem value="sell">บิลขาย</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>สถานะ</Label>
            <Select value={status} onValueChange={(v: any) => setStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="paid">จ่ายแล้ว</SelectItem>
                <SelectItem value="due">ค้างจ่าย</SelectItem>
                <SelectItem value="installment">แบ่งชำระ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2 lg:col-span-2">
            <Label>ระหว่างวันที่</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2" />
                  {range.from ? (
                    <span>
                      {range.from.toLocaleDateString()} - {range.to?.toLocaleDateString() ?? "ปัจจุบัน"}
                    </span>
                  ) : (
                    <span>เลือกช่วงวันที่</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="range"
                  selected={range as any}
                  onSelect={(v: any) => setRange(v ?? {})}
                  numberOfMonths={2}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="lg:col-span-5 flex items-center gap-2">
            <Button onClick={() => refetch()}>ค้นหา</Button>
            <Button variant="secondary" onClick={() => { setQ(""); setType("all"); setStatus("all"); setRange({}); }}>รีเซ็ตตัวกรอง</Button>
            <FilteredExportButton 
              data={filtered} 
              filename="bills.csv" 
              type="bills" 
              onExport={() => {}} 
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>บิลล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead>ชื่อลูกค้า</TableHead>
                  <TableHead className="text-right">ยอดรวม</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                      <TableCell><div className="h-4 w-28 bg-muted animate-pulse rounded" /></TableCell>
                      <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                    </TableRow>
                  ))
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>ไม่พบข้อมูล</TableCell>
                  </TableRow>
                ) : (
                  filtered.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.date.toLocaleDateString()}</TableCell>
                      <TableCell>
                        <span className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium border",
                          r.type === "buy"
                            ? "text-[hsl(var(--brand-3))] border-[hsl(var(--brand-3))]"
                            : "text-[hsl(var(--positive))] border-[hsl(var(--positive))]"
                        )}>
                          {r.type === "buy" ? "บิลซื้อ" : "บิลขาย"}
                        </span>
                      </TableCell>
                      <TableCell>{r.customer}</TableCell>
                      <TableCell className="text-right">฿ {r.total.toLocaleString()}</TableCell>
                      <TableCell>
                        <Select
                          value={r.status}
                          onValueChange={(v: any) => {
                            if (v === "installment") {
                              setInstallmentBill({ id: r.id, total: r.total });
                            } else {
                              setUpdateStatusData({ id: r.id, status: v });
                            }
                          }}
                        >
                          <SelectTrigger className={cn(
                            "w-[140px] border", 
                            r.status === "due" && "text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]",
                            r.status === "paid" && "text-[hsl(var(--positive))] border-[hsl(var(--positive))]",
                            r.status === "installment" && "text-yellow-600 border-yellow-600"
                          )}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-background">
                            <SelectItem value="paid">ชำระแล้ว</SelectItem>
                            <SelectItem value="due">ค้างจ่าย</SelectItem>
                            <SelectItem value="installment">แบ่งชำระ</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="hover-scale" onClick={() => {
                          const url = `${window.location.origin}/print/${r.id}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }} aria-label="พิมพ์"><Printer /></Button>
                        <Button size="sm" variant="outline" className="hover-scale" aria-label="แก้ไข" onClick={() => navigate(`/create?id=${r.id}`)}><Pencil /></Button>
                        <Button size="sm" className="hover-scale bg-[#06C755] text-white hover:bg-[#06C755]/90" aria-label="แชร์ไป Line" onClick={() => handleShareToLine(r.id)}><MessageCircle className="fill-current" /></Button>
                        <Button size="sm" variant="destructive" className="hover-scale" aria-label="ลบ" onClick={() => setDeleteId(r.id)}><Trash2 /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการลบบิลนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (deleteId) {
                  deleteMutation.mutate(deleteId);
                }
              }} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              ลบ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!updateStatusData} onOpenChange={(open) => !open && setUpdateStatusData(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการเปลี่ยนสถานะ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณต้องการเปลี่ยนสถานะบิลเป็น "{updateStatusData?.status === 'paid' ? 'ชำระแล้ว' : 'ค้างจ่าย'}" ใช่หรือไม่?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (updateStatusData) updateStatusMutation.mutate(updateStatusData); }}>
              ยืนยัน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {installmentBill && (
        <InstallmentDialog
          open={!!installmentBill}
          onOpenChange={(open) => !open && setInstallmentBill(null)}
          billId={installmentBill.id}
          billTotal={installmentBill.total}
          onSuccess={() => {
            refetch();
            refetchInstallments();
          }}
        />
      )}
        </TabsContent>

        <TabsContent value="installments" className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-muted-foreground">จัดการและติดตามงวดชำระทั้งหมด</p>
            <Select value={installmentStatusFilter} onValueChange={setInstallmentStatusFilter}>
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

          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">ยอดเต็มทั้งหมด</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">฿{installmentStats.totalAmount.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">ชำระแล้ว</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-[hsl(var(--positive))]">฿{installmentStats.totalPaid.toLocaleString()}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">คงเหลือ</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">฿{installmentStats.totalRemaining.toLocaleString()}</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-0">
              {installmentsLoading ? (
                <div className="p-6">
                  <LoadingTable columns={8} rows={5} />
                </div>
              ) : filteredInstallments.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <CalendarIcon className="h-12 w-12 mx-auto mb-3 opacity-20" />
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
        </TabsContent>
      </Tabs>
    </div>
  );
}
