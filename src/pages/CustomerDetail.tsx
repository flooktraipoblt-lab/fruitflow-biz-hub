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
    <div className="container mx-auto px-4 py-8 space-y-8 animate-fade-in">
      <Helmet>
        <title>{name} | Fruit Flow</title>
        <meta name="description" content="โปรไฟล์ลูกค้า บิลล่าสุด ค้างจ่าย และตะกร้าล่าสุด" />
        <link rel="canonical" href={`${window.location.origin}/customers/${id}`} />
      </Helmet>

      {/* Header Section */}
      <div className="bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl p-8 border border-primary/20 shadow-elegant">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-gradient-to-br from-primary to-primary/60 rounded-full flex items-center justify-center shadow-glow">
            <span className="text-2xl font-bold text-white">
              {name?.charAt(0).toUpperCase() || 'C'}
            </span>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary mb-2">{name}</h1>
            <p className="text-muted-foreground">รายละเอียดข้อมูลลูกค้าและประวัติการทำรายการ</p>
          </div>
        </div>
      </div>

      {/* Profile Card */}
      <Card className="shadow-elegant border-primary/10 bg-gradient-to-br from-card to-primary/5">
        <CardHeader className="bg-gradient-to-r from-primary/10 to-transparent border-b border-primary/10">
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <div className="w-2 h-6 bg-primary rounded-full"></div>
            ข้อมูลลูกค้า
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-3 p-4 bg-card rounded-lg border border-primary/10 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                👤 ชื่อลูกค้า
              </span>
              <p className="text-lg font-semibold text-primary">{profile?.name || '-'}</p>
            </div>
            <div className="space-y-3 p-4 bg-card rounded-lg border border-primary/10 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                📞 เบอร์โทรศัพท์
              </span>
              <p className="text-lg font-semibold text-primary">{profile?.phone || '-'}</p>
            </div>
            <div className="space-y-3 p-4 bg-card rounded-lg border border-primary/10 shadow-sm">
              <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                🏷️ แท็ก
              </span>
              <p className="text-lg font-semibold text-primary">{Array.isArray(profile?.tags) && profile.tags.length ? profile.tags.join(', ') : '-'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bills Section */}
      <Card className="shadow-elegant border-primary/10">
        <CardHeader className="bg-gradient-to-r from-accent/5 to-transparent">
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <div className="w-2 h-6 bg-accent rounded-full"></div>
            5 รายการซื้อขายล่าสุด
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-muted overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">วันที่</TableHead>
                  <TableHead className="font-semibold">ประเภท</TableHead>
                  <TableHead className="text-right font-semibold">ยอดรวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      ไม่มีข้อมูลการทำรายการ
                    </TableCell>
                  </TableRow>
                ) : (
                  bills.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">{new Date(b.bill_date).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          b.type === 'buy' 
                            ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                            : 'bg-accent/10 text-accent-foreground border border-accent/20'
                        }`}>
                          {b.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold">฿ {Number(b.total || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Unpaid Bills Section */}
      <Card className="shadow-elegant border-destructive/20">
        <CardHeader className="bg-gradient-to-r from-destructive/5 to-transparent">
          <CardTitle className="text-xl text-destructive flex items-center gap-2">
            <div className="w-2 h-6 bg-destructive rounded-full"></div>
            บิลค้างจ่าย
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="rounded-lg border border-muted overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">วันที่</TableHead>
                  <TableHead className="font-semibold">ประเภท</TableHead>
                  <TableHead className="text-right font-semibold">ยอดรวม</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {unpaid.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-8">
                      ไม่มีบิลค้างจ่าย
                    </TableCell>
                  </TableRow>
                ) : (
                  unpaid.map((b) => (
                    <TableRow key={b.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">{new Date(b.bill_date).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          b.type === 'buy' 
                            ? 'bg-destructive/10 text-destructive border border-destructive/20' 
                            : 'bg-accent/10 text-accent-foreground border border-accent/20'
                        }`}>
                          {b.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold text-destructive">฿ {Number(b.total || 0).toLocaleString()}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Baskets Section */}
      <Card className="shadow-elegant border-primary/10">
        <CardHeader className="bg-gradient-to-r from-secondary/5 to-transparent">
          <CardTitle className="text-xl text-primary flex items-center gap-2">
            <div className="w-2 h-6 bg-secondary rounded-full"></div>
            5 รายการตะกร้าล่าสุด และคงเหลือสุทธิ
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 space-y-6">
          <div className="rounded-lg border border-muted overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="font-semibold">วันที่</TableHead>
                  <TableHead className="font-semibold">เข้า/ออก</TableHead>
                  <TableHead className="font-semibold">ประเภท</TableHead>
                  <TableHead className="font-semibold">ชื่อ</TableHead>
                  <TableHead className="text-right font-semibold">จำนวน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {baskets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      ไม่มีข้อมูลตะกร้า
                    </TableCell>
                  </TableRow>
                ) : (
                  baskets.map((r) => (
                    <TableRow key={r.id} className="hover:bg-muted/20 transition-colors">
                      <TableCell className="font-medium">{new Date(r.basket_date).toLocaleDateString('th-TH')}</TableCell>
                      <TableCell>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                          r.flow === 'in'
                            ? 'bg-accent/10 text-accent-foreground border border-accent/20'
                            : 'bg-destructive/10 text-destructive border border-destructive/20'
                        }`}>
                          {r.flow === 'in' ? 'เข้า' : 'ออก'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="px-2 py-1 rounded-md bg-muted text-sm">
                          {r.basket_type === 'named' ? 'ตะกร้าชื่อ' : 'ฉับฉ่าย'}
                        </span>
                      </TableCell>
                      <TableCell>{r.basket_type === 'named' ? (r.basket_name || '-') : '-'}</TableCell>
                      <TableCell className="text-right font-semibold">{r.quantity}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          
          {/* Basket Summary */}
          <div className="bg-gradient-to-br from-secondary/10 via-secondary/5 to-card rounded-xl p-6 border border-secondary/20 shadow-glow">
            <h3 className="text-lg font-semibold text-secondary mb-6 flex items-center gap-3">
              <div className="w-3 h-6 bg-secondary rounded-full shadow-sm"></div>
              📊 สรุปคงเหลือสุทธิ
            </h3>
            <div className="grid gap-4">
              {Object.keys(basketSummary).length === 0 ? (
                <div className="text-center py-8 text-muted-foreground font-medium bg-muted/20 rounded-lg border-2 border-dashed border-muted">
                  ไม่มีข้อมูลคงเหลือ
                </div>
              ) : (
                Object.entries(basketSummary).map(([k,v]) => (
                  <div key={k} className={`flex justify-between items-center rounded-xl p-4 border-2 transition-all duration-200 hover:scale-[1.02] ${
                    v > 0 
                      ? 'bg-accent/10 border-accent/30 hover:bg-accent/15' 
                      : v < 0 
                        ? 'bg-destructive/10 border-destructive/30 hover:bg-destructive/15' 
                        : 'bg-muted/10 border-muted/30 hover:bg-muted/15'
                  }`}>
                    <span className="font-semibold text-foreground flex items-center gap-2">
                      🗂️ {k}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={`font-bold text-xl px-3 py-1 rounded-lg ${
                        v > 0 
                          ? 'text-accent bg-accent/20' 
                          : v < 0 
                            ? 'text-destructive bg-destructive/20' 
                            : 'text-muted-foreground bg-muted/20'
                      }`}>
                        {v > 0 ? '+' : ''}{v}
                      </span>
                      <span className="text-sm text-muted-foreground">ชิ้น</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}