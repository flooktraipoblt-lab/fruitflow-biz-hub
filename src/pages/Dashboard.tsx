import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ExportButton } from "@/components/common/ExportButton";
import DigitalClock from "@/components/common/DigitalClock";
import Mailbox from "@/components/common/Mailbox";
import { NotificationDialog, type NotificationItem } from "@/components/modals/NotificationDialog";
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
