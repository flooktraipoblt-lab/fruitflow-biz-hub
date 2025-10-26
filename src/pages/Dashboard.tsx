import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ExportButton } from "@/components/common/ExportButton";
import DigitalClock from "@/components/common/DigitalClock";
import Mailbox from "@/components/common/Mailbox";
import { NotificationDialog, type NotificationItem } from "@/components/modals/NotificationDialog";
import { AttendanceShortcuts } from "@/components/dashboard/AttendanceShortcuts";
import { BillPDFExport } from "@/components/dashboard/BillPDFExport";
import { useEffect, useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { BellRing, ExternalLink, Crown, UserRound, CalendarDays } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from "recharts";
const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type RangeKey = "today" | "7d" | "month";

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("today");
  
  const { toast } = useToast();

  const rangeDates = useMemo(() => {
    const now = new Date();
    let from = new Date(now);
    if (range === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
      from.setDate(now.getDate() - 6);
      from.setHours(0,0,0,0);
    } else if (range === "month") {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    return { from, to: now };
  }, [range]);

  const { data: bills = [] } = useQuery({
    queryKey: ["dashboard-bills", rangeDates],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("bills")
        .select("id, bill_date, type, customer, total, status")
        .gte("bill_date", rangeDates.from.toISOString())
        .lte("bill_date", rangeDates.to.toISOString())
        .order("bill_date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: expenses = [] } = useQuery({
    queryKey: ["dashboard-expenses", rangeDates],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("expenses")
        .select("id, date, type, amount")
        .gte("date", rangeDates.from.toISOString())
        .lte("date", rangeDates.to.toISOString())
        .order("date", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const metrics = useMemo(() => {
    let buy = 0, sell = 0, expenseTotal = 0;
    bills.forEach((b: any) => {
      const t = Number(b.total ?? 0);
      if (b.type === "buy") buy += t;
      if (b.type === "sell") sell += t;
    });
    expenses.forEach((e: any) => {
      expenseTotal += Number(e.amount ?? 0);
    });
    return { buy, sell, expenses: expenseTotal, profit: sell - buy - expenseTotal };
  }, [bills, expenses]);

  const dueTop = useMemo(() => {
    const list = (bills as any[]).filter((b:any) => b.status === 'due');
    list.sort((a:any,b:any) => Number(b.total ?? 0) - Number(a.total ?? 0));
    return list.slice(0,5);
  }, [bills]);

  const maxDue = useMemo(() => {
    return dueTop.length ? Math.max(...dueTop.map((b:any) => Number(b.total ?? 0))) : 0;
  }, [dueTop]);

  // ดึงรายการสินค้าขายดี (จากบิลขายภายในช่วงเวลา)
  const { data: sellItems = [] } = useQuery({
    queryKey: ["dashboard-sell-items", rangeDates, (bills as any[]).map((b: any) => b.id)],
    enabled: (bills as any[]).some((b: any) => b.type === "sell"),
    queryFn: async () => {
      const sellIds = (bills as any[]).filter((b: any) => b.type === "sell").map((b: any) => b.id);
      if (sellIds.length === 0) return [];
      const { data, error } = await (supabase as any)
        .from("bill_items")
        .select("bill_id, name, qty, weight, fraction, price")
        .in("bill_id", sellIds);
      if (error) throw error;
      return data ?? [];
    },
  });

  // จัดกลุ่มยอดขายตามสินค้าและเลือก Top 5
  const topProducts = useMemo(() => {
    const map = new Map<string, number>();
    (sellItems as any[]).forEach((it: any) => {
      const qty = Number(it.qty) || 0;
      const weight = Number(it.weight) || 0;
      const fraction = Number(it.fraction) || 0;
      const price = Number(it.price) || 0;
      const totalWeight = qty * weight + fraction;
      const amount = totalWeight * price;
      const name = it.name || "ไม่ระบุ";
      map.set(name, (map.get(name) || 0) + amount);
    });
    const arr = Array.from(map.entries()).map(([name, amount]) => ({ name, amount }));
    arr.sort((a, b) => b.amount - a.amount);
    const top = arr.slice(0, 5);
    const others = arr.slice(5).reduce((acc, x) => acc + x.amount, 0);
    if (others > 0) top.push({ name: "อื่นๆ", amount: others });
    return top;
  }, [sellItems]);

  // กราฟแท่งแสดงยอดซื้อ/ยอดขายรายวัน
  const barData = useMemo(() => {
    const rows: { label: string; buy: number; sell: number }[] = [];
    const start = new Date(rangeDates.from);
    const end = new Date(rangeDates.to);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString("th-TH", { day: "2-digit", month: "2-digit" });
      const dayBills = (bills as any[]).filter((b: any) => (b.bill_date || "").slice(0, 10) === dateStr);
      const buySum = dayBills.filter((b: any) => b.type === "buy").reduce((acc: number, b: any) => acc + Number(b.total || 0), 0);
      const sellSum = dayBills.filter((b: any) => b.type === "sell").reduce((acc: number, b: any) => acc + Number(b.total || 0), 0);
      rows.push({ label, buy: buySum, sell: sellSum });
    }
    return rows;
  }, [bills, rangeDates]);

  // ยอดขายตามลูกค้า (Top 5)
  const salesByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    (bills as any[]).filter((b: any) => b.type === "sell").forEach((b: any) => {
      const customer = b.customer || "ไม่ระบุ";
      map.set(customer, (map.get(customer) || 0) + Number(b.total || 0));
    });
    const arr = Array.from(map.entries()).map(([name, value]) => ({ name, value }));
    arr.sort((a, b) => b.value - a.value);
    return arr.slice(0, 5);
  }, [bills]);

  // รายจ่ายตามประเภท
  const expensesByType = useMemo(() => {
    const map = new Map<string, number>();
    expenses.forEach((e: any) => {
      const type = e.type || "อื่นๆ";
      map.set(type, (map.get(type) || 0) + Number(e.amount || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }));
  }, [expenses]);

  // สถิติตะกร้า
  const { data: baskets = [] } = useQuery({
    queryKey: ["dashboard-baskets", rangeDates],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("baskets")
        .select("id, basket_date, flow, quantity")
        .gte("basket_date", rangeDates.from.toISOString())
        .lte("basket_date", rangeDates.to.toISOString());
      if (error) throw error;
      return data ?? [];
    },
  });

  const basketStats = useMemo(() => {
    let inCount = 0, outCount = 0;
    (baskets as any[]).forEach((b: any) => {
      const qty = Number(b.quantity || 0);
      if (b.flow === "in") inCount += qty;
      if (b.flow === "out") outCount += qty;
    });
    return { in: inCount, out: outCount, net: inCount - outCount };
  }, [baskets]);

  const CHART_COLORS = ["hsl(231, 70%, 60%)", "hsl(284, 65%, 52%)", "hsl(334, 75%, 50%)", "hsl(142, 72%, 35%)", "hsl(0, 72%, 50%)", "hsl(45, 93%, 47%)"];


  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>Dashboard | Fruit Flow</title>
        <meta name="description" content="สรุปรายงาน ซื้อ-ขาย กำไร ลูกค้า และแจ้งเตือนแบบรวดเร็ว" />
        <link rel="canonical" href={`${window.location.origin}/dashboard`} />
      </Helmet>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2">
          <Mailbox />
          <DigitalClock />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="ยอดซื้อทั้งหมด" value={`฿ ${money(metrics.buy)}`} range={range} onRange={setRange} />
        <MetricCard title="ยอดขายทั้งหมด" value={`฿ ${money(metrics.sell)}`} range={range} onRange={setRange} />
        <MetricCard title="ค่าใช้จ่าย" value={`฿ ${money(metrics.expenses)}`} range={range} onRange={setRange} />
        <MetricCard title="กำไร" value={`฿ ${money(metrics.profit)}`} range={range} onRange={setRange} />
      </div>

      {/* กราฟแท่ง: ยอดซื้อ/ขายรายวัน */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>ยอดซื้อ/ขาย รายวัน</CardTitle>
              <CardDescription>เปรียบเทียบยอดซื้อและขายในแต่ละวัน</CardDescription>
            </div>
            <div className="flex gap-2">
              <AttendanceShortcuts />
              <BillPDFExport />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={barData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <RechartsTooltip 
                contentStyle={{ 
                  backgroundColor: "hsl(var(--card))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "var(--radius)"
                }}
              />
              <Legend />
              <Bar dataKey="buy" fill={CHART_COLORS[0]} name="ยอดซื้อ" />
              <Bar dataKey="sell" fill={CHART_COLORS[1]} name="ยอดขาย" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {/* กราฟวงกลม: สินค้าขายดี */}
        <Card>
          <CardHeader>
            <CardTitle>สินค้าขายดี Top 5</CardTitle>
            <CardDescription>สินค้าที่มียอดขายสูงสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={topProducts}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (฿${money(entry.amount)})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="amount"
                >
                  {topProducts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => `฿${money(Number(value))}`}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* กราฟแท่ง: ยอดขายตามลูกค้า */}
        <Card>
          <CardHeader>
            <CardTitle>ยอดขายตามลูกค้า Top 5</CardTitle>
            <CardDescription>ลูกค้าที่มียอดซื้อสูงสุด</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={salesByCustomer} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis type="number" stroke="hsl(var(--muted-foreground))" />
                <YAxis dataKey="name" type="category" stroke="hsl(var(--muted-foreground))" width={100} />
                <RechartsTooltip 
                  formatter={(value: any) => `฿${money(Number(value))}`}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
                <Bar dataKey="value" fill={CHART_COLORS[2]} name="ยอดขาย" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* กราฟวงกลม: รายจ่ายตามประเภท */}
        <Card>
          <CardHeader>
            <CardTitle>รายจ่ายตามประเภท</CardTitle>
            <CardDescription>การกระจายรายจ่ายในแต่ละประเภท</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={expensesByType}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name} (฿${money(entry.value)})`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip 
                  formatter={(value: any) => `฿${money(Number(value))}`}
                  contentStyle={{ 
                    backgroundColor: "hsl(var(--card))", 
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "var(--radius)"
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* สถิติตะกร้า */}
        <Card>
          <CardHeader>
            <CardTitle>สถิติตะกร้า</CardTitle>
            <CardDescription>การเคลื่อนไหวของตะกร้า</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ตะกร้าเข้า</span>
              <span className="text-2xl font-bold" style={{ color: "hsl(var(--positive))" }}>{basketStats.in}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">ตะกร้าออก</span>
              <span className="text-2xl font-bold" style={{ color: "hsl(var(--negative))" }}>{basketStats.out}</span>
            </div>
            <div className="flex items-center justify-between pt-4 border-t">
              <span className="text-sm font-semibold">คงเหลือสุทธิ</span>
              <span className="text-3xl font-extrabold bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] bg-clip-text text-transparent">
                {basketStats.net}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ตารางบิลค้างชำระ */}
      {dueTop.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>บิลค้างชำระ Top 5</CardTitle>
            <CardDescription>บิลที่ยังไม่ได้ชำระเรียงตามยอดเงิน</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {dueTop.map((bill: any) => {
                const amount = Number(bill.total || 0);
                const pct = maxDue > 0 ? (amount / maxDue) * 100 : 0;
                return (
                  <div key={bill.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <Link to={`/bills`} className="font-medium hover:underline">
                        {bill.customer} ({bill.type === "buy" ? "ซื้อ" : "ขาย"})
                      </Link>
                      <span className="font-semibold">฿{money(amount)}</span>
                    </div>
                    <Progress value={pct} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}

function MetricCard({ title, value, range, onRange }: { title: string; value: string; range: RangeKey; onRange: (r: RangeKey) => void }) {
  return (
    <Card className="hover:shadow-lg transition-all" style={{ boxShadow: "var(--shadow-soft)" }}>
      <CardHeader className="flex-row items-center justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>สรุปตามช่วงเวลา</CardDescription>
        </div>
        <ExportButton data={[{ title, value }]} filename={`${title}.csv`} />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-extrabold bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] bg-clip-text text-transparent">
          {value}
        </div>
        <Tabs value={range} className="mt-4">
          <TabsList>
            <TabsTrigger value="today" onClick={() => onRange("today")}>วันนี้</TabsTrigger>
            <TabsTrigger value="7d" onClick={() => onRange("7d")}>7 วัน</TabsTrigger>
            <TabsTrigger value="month" onClick={() => onRange("month")}>เดือนนี้</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
