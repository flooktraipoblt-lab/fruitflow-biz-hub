import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ExportButton } from "@/components/common/ExportButton";
import DigitalClock from "@/components/common/DigitalClock";
import Mailbox from "@/components/common/Mailbox";
import { AttendanceShortcuts } from "@/components/dashboard/AttendanceShortcuts";
import { BillsPDFExport } from "@/components/dashboard/BillsPDFExport";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

type RangeKey = "today" | "7d" | "month";

export default function Dashboard() {
  const [range, setRange] = useState<RangeKey>("today");

  const rangeDates = useMemo(() => {
    const now = new Date();
    let from = new Date(now);
    if (range === "today") {
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (range === "7d") {
      from.setDate(now.getDate() - 6);
      from.setHours(0, 0, 0, 0);
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

      {/* Action Buttons */}
      <div className="flex gap-2 justify-end flex-wrap">
        <AttendanceShortcuts />
        <BillsPDFExport />
      </div>
    </div>
  );
}

interface MetricCardProps {
  title: string;
  value: string;
  range: RangeKey;
  onRange: (r: RangeKey) => void;
}

function MetricCard({ title, value, range, onRange }: MetricCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <ExportButton data={[value]} filename={`${title}.txt`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <Tabs value={range} onValueChange={(v) => onRange(v as RangeKey)} className="mt-3">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="today">วันนี้</TabsTrigger>
            <TabsTrigger value="7d">7 วัน</TabsTrigger>
            <TabsTrigger value="month">เดือนนี้</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
