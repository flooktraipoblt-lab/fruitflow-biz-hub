import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import DigitalClock from "@/components/common/DigitalClock";
import Mailbox from "@/components/common/Mailbox";
import { AttendanceShortcuts } from "@/components/dashboard/AttendanceShortcuts";
import { BillsPDFExport } from "@/components/dashboard/BillsPDFExport";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { format, eachDayOfInterval } from "date-fns";
import {
  FileText, Receipt, Wallet, ShoppingBasket, Eye, EyeOff, TrendingUp,
  AlertCircle, Activity, Users,
} from "lucide-react";

const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const num = (n: number) => n.toLocaleString("th-TH", { maximumFractionDigits: 1 });

type RangeKey = "today" | "7d" | "month" | "6m" | "1y" | "3y" | "5y";

async function fetchAll(build: (from: number, to: number) => any) {
  const out: any[] = [];
  let from = 0;
  const size = 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await build(from, from + size - 1);
    if (error) throw error;
    out.push(...(data ?? []));
    if (!data || data.length < size) break;
    from += size;
  }
  return out;
}

const chartConfig = {
  buy: { label: "ซื้อ", color: "hsl(var(--destructive))" },
  sell: { label: "ขาย", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("7d");
  const [showProfit, setShowProfit] = useState(false);
  const navigate = useNavigate();
  const sb = supabase as any;

  const rangeDates = useMemo(() => {
    const now = new Date();
    let from: Date;
    if (range === "today") from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    else if (range === "7d") { from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6); }
    else if (range === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
    else if (range === "6m") from = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    else if (range === "1y") from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    else if (range === "3y") from = new Date(now.getFullYear() - 3, now.getMonth(), now.getDate());
    else from = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
    const to = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    return { from, to };
  }, [range]);

  const fromIso = rangeDates.from.toISOString();
  const toIso = rangeDates.to.toISOString();

  const { data: bills = [] } = useQuery({
    queryKey: ["dash-bills", fromIso, toIso],
    queryFn: () => fetchAll((a, b) => sb.from("bills")
      .select("id, bill_no, bill_date, type, customer, total, status")
      .gte("bill_date", fromIso).lte("bill_date", toIso)
      .order("bill_date", { ascending: false }).range(a, b)),
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["dash-expenses", fromIso, toIso],
    queryFn: () => fetchAll((a, b) => sb.from("expenses").select("id, date, type, amount")
      .gte("date", fromIso).lte("date", toIso).range(a, b)),
  });

  const { data: dueBills = [] } = useQuery({
    queryKey: ["dash-due"],
    queryFn: () => fetchAll((a, b) => sb.from("bills").select("id, bill_no, bill_date, type, customer, total, status")
      .in("status", ["due", "installment"]).order("bill_date", { ascending: true }).range(a, b)),
  });

  const { data: baskets = [] } = useQuery({
    queryKey: ["dash-baskets"],
    queryFn: () => fetchAll((a, b) => sb.from("baskets").select("customer, quantity, flow, basket_date").range(a, b)),
  });

  const { data: recent = [] } = useQuery({
    queryKey: ["dash-recent"],
    queryFn: async () => {
      const { data, error } = await sb.from("bills").select("id, bill_no, bill_date, type, customer, total, status, created_at")
        .order("created_at", { ascending: false }).limit(8);
      if (error) throw error;
      return data ?? [];
    },
  });

  const m = useMemo(() => {
    let buy = 0, sell = 0, exp = 0;
    bills.forEach((b: any) => {
      if (b.type === "buy") buy += Number(b.total || 0);
      if (b.type === "sell") sell += Number(b.total || 0);
    });
    expenses.forEach((e: any) => (exp += Number(e.amount || 0)));
    const profit = sell - buy - exp;
    const margin = sell > 0 ? (profit / sell) * 100 : 0;
    return { buy, sell, exp, profit, margin };
  }, [bills, expenses]);

  const debt = useMemo(() => {
    let recv = 0, pay = 0, recvN = 0, payN = 0;
    dueBills.forEach((b: any) => {
      if (b.type === "sell") { recv += Number(b.total || 0); recvN++; }
      else { pay += Number(b.total || 0); payN++; }
    });
    const top = [...dueBills].filter((b: any) => b.type === "sell")
      .sort((a: any, b: any) => Number(b.total) - Number(a.total)).slice(0, 5);
    return { recv, pay, recvN, payN, top };
  }, [dueBills]);

  const basketStats = useMemo(() => {
    const per: Record<string, number> = {};
    let outToday = 0, inToday = 0;
    const today = format(new Date(), "yyyy-MM-dd");
    baskets.forEach((r: any) => {
      const q = Number(r.quantity || 0);
      per[r.customer] = (per[r.customer] || 0) + (r.flow === "out" ? q : -q);
      if (format(new Date(r.basket_date), "yyyy-MM-dd") === today) {
        if (r.flow === "out") outToday += q; else inToday += q;
      }
    });
    const list = Object.entries(per).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
    const outstanding = list.reduce((s, [, v]) => s + v, 0);
    return { outstanding, outToday, inToday, top: list.slice(0, 5) };
  }, [baskets]);

  const chartData = useMemo(() => {
    const isLong = range === "6m" || range === "1y" || range === "3y" || range === "5y";
    if (!isLong) {
      const days = eachDayOfInterval({ start: rangeDates.from, end: rangeDates.to });
      const map: Record<string, { day: string; buy: number; sell: number }> = {};
      days.forEach((d) => { const k = format(d, "yyyy-MM-dd"); map[k] = { day: format(d, "dd/MM"), buy: 0, sell: 0 }; });
      bills.forEach((b: any) => {
        const k = format(new Date(b.bill_date), "yyyy-MM-dd");
        if (!map[k]) return;
        if (b.type === "buy") map[k].buy += Number(b.total || 0);
        if (b.type === "sell") map[k].sell += Number(b.total || 0);
      });
      return Object.values(map);
    }
    // ช่วงยาว: รวมเป็นรายเดือน
    const startM = new Date(rangeDates.from.getFullYear(), rangeDates.from.getMonth(), 1);
    const endM = new Date(rangeDates.to.getFullYear(), rangeDates.to.getMonth(), 1);
    const map: Record<string, { day: string; buy: number; sell: number }> = {};
    for (const d = new Date(startM); d <= endM; d.setMonth(d.getMonth() + 1)) {
      map[format(d, "yyyy-MM")] = { day: format(d, "MM/yy"), buy: 0, sell: 0 };
    }
    bills.forEach((b: any) => {
      const k = format(new Date(b.bill_date), "yyyy-MM");
      if (!map[k]) return;
      if (b.type === "buy") map[k].buy += Number(b.total || 0);
      if (b.type === "sell") map[k].sell += Number(b.total || 0);
    });
    return Object.values(map);
  }, [bills, rangeDates, range]);

  const daysAgo = (d: string) => Math.max(0, Math.floor((Date.now() - new Date(d).getTime()) / 86400000));

  return (
    <div className="space-y-5 animate-fade-in">
      <Helmet>
        <title>Dashboard | Fruit Flow</title>
        <meta name="description" content="ศูนย์ควบคุมหน้างาน ซื้อ-ขาย หนี้ค้าง ตะกร้า และกิจกรรมล่าสุด" />
      </Helmet>

      {/* Top bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ศูนย์ควบคุมหน้างาน</h1>
          <p className="text-sm text-muted-foreground">ข้อมูลจริงจากบิล ค่าใช้จ่าย และตะกร้า</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as RangeKey)}>
            <TabsList>
              <TabsTrigger value="today">วันนี้</TabsTrigger>
              <TabsTrigger value="7d">7 วัน</TabsTrigger>
              <TabsTrigger value="month">เดือนนี้</TabsTrigger>
              <TabsTrigger value="6m">6 เดือน</TabsTrigger>
              <TabsTrigger value="1y">1 ปี</TabsTrigger>
              <TabsTrigger value="3y">3 ปี</TabsTrigger>
              <TabsTrigger value="5y">5 ปี</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={() => setShowProfit((s) => !s)}>
            {showProfit ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {showProfit ? "ซ่อนกำไร" : "แสดงกำไร"}
          </Button>
          <Mailbox />
          <DigitalClock />
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi icon={<ArrowDownLeft className="h-4 w-4" />} title="ซื้อ">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold">฿{money(m.buy)}</span>
            <span className="text-sm text-muted-foreground">รวมยอดซื้อ</span>
          </div>
          <div className="mt-2 text-sm text-muted-foreground">ค่าใช้จ่าย ฿{money(m.exp)}</div>
        </Kpi>
        <Kpi icon={<ArrowUpRight className="h-4 w-4" />} title="ขาย">
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-primary">฿{money(m.sell)}</span>
            <span className="text-sm text-muted-foreground">รวมยอดขาย</span>
          </div>
          <div className="mt-2 text-sm">
            กำไรสุทธิ:{" "}
            <span className={`font-semibold ${m.profit >= 0 ? "text-[hsl(var(--positive))]" : "text-destructive"}`}>
              {showProfit ? `฿${money(m.profit)} (${m.margin.toFixed(1)}%)` : "฿ •••••"}
            </span>
          </div>
        </Kpi>
        <Kpi icon={<AlertCircle className="h-4 w-4" />} title="หนี้ค้าง (ทั้งหมด)">
          <div className="text-xl font-bold text-destructive">฿{money(debt.recv)}</div>
          <div className="text-sm text-muted-foreground">ลูกค้าค้างจ่าย {debt.recvN} บิล</div>
          <div className="mt-2 text-sm">ต้องจ่ายสวน: <b>฿{money(debt.pay)}</b> ({debt.payN} บิล)</div>
        </Kpi>
        <Kpi icon={<ShoppingBasket className="h-4 w-4" />} title="ตะกร้าค้างข้างนอก">
          <div className="text-xl font-bold">{num(basketStats.outstanding)} ใบ</div>
          <div className="text-sm text-muted-foreground">วันนี้ ออก {basketStats.outToday} · คืน {basketStats.inToday}</div>
        </Kpi>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Left 2/3 */}
        <div className="space-y-5 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">แนวโน้มยอดซื้อ vs ยอดขายรายวัน</CardTitle></CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[260px] w-full">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} fontSize={12} width={60}
                    tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k` : v)} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="buy" fill="var(--color-buy)" radius={4} />
                  <Bar dataKey="sell" fill="var(--color-sell)" radius={4} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">ลูกค้าค้างชำระยอดสูงสุด</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate("/bills?status=due")}>ดูทั้งหมด</Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {debt.top.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีบิลค้างชำระ</p>}
              {debt.top.map((b: any) => (
                <button key={b.id} onClick={() => navigate(`/print/${b.id}`)}
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left transition-colors hover:bg-muted/50">
                  <div>
                    <div className="font-medium">{b.customer}</div>
                    <div className="text-xs text-muted-foreground">{b.bill_no} · ค้าง {daysAgo(b.bill_date)} วัน</div>
                  </div>
                  <div className="font-semibold text-destructive">฿{money(Number(b.total))}</div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">ทางลัด</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button onClick={() => navigate("/create")}><FileText className="h-4 w-4 mr-1" />สร้างบิล</Button>
              <Button variant="outline" onClick={() => navigate("/bills")}><Receipt className="h-4 w-4 mr-1" />รายการบิล</Button>
              <Button variant="outline" onClick={() => navigate("/baskets")}><ShoppingBasket className="h-4 w-4 mr-1" />ตะกร้า</Button>
              <Button variant="outline" onClick={() => navigate("/expenses")}><Wallet className="h-4 w-4 mr-1" />ค่าใช้จ่าย</Button>
              <Button variant="outline" onClick={() => navigate("/customers")}><Users className="h-4 w-4 mr-1" />ลูกค้า</Button>
              <BillsPDFExport />
            </CardContent>
          </Card>
        </div>

        {/* Right 1/3 */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4" />บิลล่าสุด</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {recent.map((b: any) => (
                <button key={b.id} onClick={() => navigate(`/print/${b.id}`)}
                  className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted/50">
                  <Badge variant={b.type === "sell" ? "default" : "secondary"} className="shrink-0">{b.type === "sell" ? "ขาย" : "ซื้อ"}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{b.customer}</div>
                    <div className="text-xs text-muted-foreground">{b.bill_no} · {format(new Date(b.bill_date), "dd/MM HH:mm")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">฿{money(Number(b.total))}</div>
                    <div className={`text-xs ${b.status === "paid" ? "text-[hsl(var(--positive))]" : "text-destructive"}`}>
                      {b.status === "paid" ? "จ่ายแล้ว" : b.status === "installment" ? "ผ่อน" : "ค้าง"}
                    </div>
                  </div>
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="flex items-center gap-2 text-base"><ShoppingBasket className="h-4 w-4" />ค้างตะกร้ามากสุด</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {basketStats.top.length === 0 && <p className="text-sm text-muted-foreground">ไม่มีตะกร้าค้าง</p>}
              {basketStats.top.map(([name, q]) => (
                <div key={name} className="flex items-center justify-between text-sm">
                  <span className="truncate">{name}</span><b>{q} ใบ</b>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">พนักงาน & ลงเวลา</CardTitle></CardHeader>
            <CardContent className="flex flex-wrap gap-2"><AttendanceShortcuts /></CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Kpi({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-2 space-y-0 pb-2 text-muted-foreground">
        {icon}<CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-0.5">{children}</CardContent>
    </Card>
  );
}
