import { Helmet } from "react-helmet-async";
import { useParams } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";

export default function CustomerDetail() {
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [bills, setBills] = useState<any[]>([]);
  const [unpaid, setUnpaid] = useState<any[]>([]);
  const [baskets, setBaskets] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      const { data: cust } = await (supabase as any).from("customers").select("id, name, phone, tags").eq("id", id).maybeSingle();
      setProfile(cust);
      if (cust?.name) {
        const [billRes, unpaidRes, basketRes] = await Promise.all([
          (supabase as any).from("bills").select("id, bill_date, type, total, status").eq("customer", cust.name).order("bill_date", { ascending: false }).limit(5),
          (supabase as any).from("bills").select("id, bill_date, type, total, status").eq("customer", cust.name).eq("status", "due").order("bill_date", { ascending: false }),
          (supabase as any).from("baskets").select("id, basket_date, basket_type, basket_name, quantity, flow").eq("customer", cust.name).order("basket_date", { ascending: false }).limit(5),
        ]);
        setBills(billRes.data ?? []);
        setUnpaid(unpaidRes.data ?? []);
        setBaskets(basketRes.data ?? []);
      }
    };
    load();
  }, [id]);

  const basketSummary = useMemo(() => {
    const sums: Record<string, number> = {};
    for (const b of baskets) {
      const key = b.basket_type + (b.basket_name ? `:${b.basket_name}` : "");
      const delta = b.flow === "in" ? b.quantity : -b.quantity;
      sums[key] = (sums[key] ?? 0) + delta;
    }
    return sums;
  }, [baskets]);

  const name = profile?.name || `ลูกค้า ${id}`;

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>{name} | Fruit Flow</title>
        <meta name="description" content="โปรไฟล์ลูกค้า บิลล่าสุด ค้างจ่าย และตะกร้าล่าสุด" />
        <link rel="canonical" href={`${window.location.origin}/customers/${id}`} />
      </Helmet>

      <h1 className="text-2xl font-bold">{name}</h1>

      <Card>
        <CardHeader>
          <CardTitle>โปรไฟล์</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <div>ชื่อ: {profile?.name || '-'}</div>
            <div>เบอร์โทร: {profile?.phone || '-'}</div>
            <div>แท็ก: {Array.isArray(profile?.tags) && profile.tags.length ? profile.tags.join(', ') : '-'}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5 รายการซื้อขายล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead className="text-right">ยอดรวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bills.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{new Date(b.bill_date).toLocaleDateString()}</TableCell>
                  <TableCell>{b.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย'}</TableCell>
                  <TableCell className="text-right">฿ {Number(b.total || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>บิลค้างจ่าย</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead className="text-right">ยอดรวม</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {unpaid.map((b) => (
                <TableRow key={b.id}>
                  <TableCell>{new Date(b.bill_date).toLocaleDateString()}</TableCell>
                  <TableCell>{b.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย'}</TableCell>
                  <TableCell className="text-right">฿ {Number(b.total || 0).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>5 รายการตะกร้าล่าสุด และคงเหลือสุทธิ</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>วันที่</TableHead>
                <TableHead>เข้า/ออก</TableHead>
                <TableHead>ประเภท</TableHead>
                <TableHead>ชื่อ</TableHead>
                <TableHead className="text-right">จำนวน</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {baskets.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{new Date(r.basket_date).toLocaleDateString()}</TableCell>
                  <TableCell>{r.flow === 'in' ? 'เข้า' : 'ออก'}</TableCell>
                  <TableCell>{r.basket_type === 'named' ? 'ตะกร้าชื่อ' : 'ฉับฉ่าย'}</TableCell>
                  <TableCell>{r.basket_type === 'named' ? (r.basket_name || '-') : '-'}</TableCell>
                  <TableCell className="text-right">{r.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 grid gap-2">
            {Object.keys(basketSummary).length === 0 ? (
              <div>คงเหลือสุทธิ: -</div>
            ) : (
              Object.entries(basketSummary).map(([k,v]) => (
                <div key={k}>คงเหลือ {k}: {v}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}