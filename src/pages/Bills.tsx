import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Calendar as CalendarIcon, Printer, Pencil, Trash2 } from "lucide-react";
import { useMemo, useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
interface BillRow {
  id: string;
  date: Date;
  type: "buy" | "sell";
  customer: string;
  total: number;
  status: "paid" | "due";
}

export default function Bills() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"all" | "buy" | "sell">("all");
  const [status, setStatus] = useState<"all" | "paid" | "due">("all");
  const [range, setRange] = useState<{ from?: Date; to?: Date }>({});
  const { toast } = useToast();
  const navigate = useNavigate();

  const [custSuggestions, setCustSuggestions] = useState<string[]>([]);
  const [itemSuggestions, setItemSuggestions] = useState<string[]>([]);
  const [showSug, setShowSug] = useState(false);

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

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      // ลบจาก Supabase ก่อน
      const { error } = await (supabase as any).from("bills").delete().eq("id", id);
      if (error) throw error;

      // ส่งข้อมูลไปยัง n8n webhook (ไม่ให้ fail webhook ส่งผลต่อการลบ)
      try {
        await fetch("http://n8n.trakarnsiam.com/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
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
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "ลบไม่สำเร็จ", description: err.message });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: "paid" | "due" }) => {
      const { error } = await (supabase as any)
        .from("bills")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "อัปเดตสถานะสำเร็จ" });
      refetch();
    },
    onError: (err: any) => {
      toast({ title: "อัปเดตสถานะไม่สำเร็จ", description: err.message });
    },
  });

  const filtered = useMemo(() => rows.filter((r) => {
    if (q && !`${r.customer}`.includes(q)) return false;
    if (type !== "all" && r.type !== type) return false;
    if (status !== "all" && r.status !== status) return false;
    if (range.from && r.date < range.from) return false;
    if (range.to && r.date > range.to) return false;
    return true;
  }), [rows, q, type, status, range]);

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>รายการบิล | Fruit Flow</title>
        <meta name="description" content="ดู ค้นหา และจัดการบิลที่บันทึกแล้ว พร้อมตัวกรองอัจฉริยะ" />
        <link rel="canonical" href={`${window.location.origin}/bills`} />
      </Helmet>

      <h1 className="text-2xl font-bold">รายการบิล</h1>

      <Card className="hover-scale">
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
          </div>
        </CardContent>
      </Card>

      <Card className="hover-scale">
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
                  <TableRow>
                    <TableCell colSpan={6}>กำลังโหลด...</TableCell>
                  </TableRow>
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
                          onValueChange={(v: any) => updateStatusMutation.mutate({ id: r.id, status: v })}
                        >
                          <SelectTrigger className={cn("w-[140px] border", r.status === "due" ? "text-[hsl(var(--destructive))] border-[hsl(var(--destructive))]" : "text-[hsl(var(--positive))] border-[hsl(var(--positive))]")}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-background">
                            <SelectItem value="paid">ชำระแล้ว</SelectItem>
                            <SelectItem value="due">ค้างจ่าย</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button size="sm" variant="outline" className="hover-scale" onClick={() => {
                          const url = `${window.location.origin}/print/${r.id}`;
                          window.open(url, '_blank', 'noopener,noreferrer');
                        }} aria-label="พิมพ์"><Printer /></Button>
                        <Button size="sm" variant="outline" className="hover-scale" aria-label="แก้ไข" onClick={() => navigate(`/create?id=${r.id}`)}><Pencil /></Button>
                        <Button size="sm" variant="destructive" className="hover-scale" aria-label="ลบ" onClick={() => deleteMutation.mutate(r.id)}><Trash2 /></Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
