import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

interface ProfileRow {
  id: string; email: string; display_name: string | null; approved: boolean;
}

export default function AdminUsers() {
  const { toast } = useToast();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    const [{ data: p, error: ep }, { data: r, error: er }] = await Promise.all([
      (supabase as any).from("profiles").select("id,email,display_name,approved").order("created_at", { ascending: true }),
      (supabase as any).from("user_roles").select("user_id,role"),
    ]);
    if (ep) toast({ title: "โหลดข้อมูลโปรไฟล์ล้มเหลว", description: ep.message });
    if (er) toast({ title: "โหลดข้อมูลสิทธิ์ล้มเหลว", description: er.message });
    setProfiles(p || []);
    const rolesMap: Record<string, string[]> = {};
    (r || []).forEach((row: any) => {
      rolesMap[row.user_id] = [...(rolesMap[row.user_id] || []), row.role];
    });
    setRoles(rolesMap);
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const filtered = useMemo(() => profiles.filter(pr =>
    pr.email.toLowerCase().includes(filter.toLowerCase()) ||
    (pr.display_name || '').toLowerCase().includes(filter.toLowerCase())
  ), [profiles, filter]);

  const toggleApprove = async (id: string, value: boolean) => {
    const { error } = await (supabase as any).from("profiles").update({ approved: value }).eq("id", id);
    if (error) toast({ title: "อัปเดตสถานะล้มเหลว", description: error.message });
    else { toast({ title: "บันทึกแล้ว" }); fetchAll(); }
  };

  const toggleAdmin = async (id: string, value: boolean) => {
    if (value) {
      const { error } = await (supabase as any).from("user_roles").insert({ user_id: id, role: "admin" });
      if (error) return toast({ title: "กำหนดแอดมินล้มเหลว", description: error.message });
    } else {
      const { error } = await (supabase as any).from("user_roles").delete().eq("user_id", id).eq("role", "admin");
      if (error) return toast({ title: "ยกเลิกแอดมินล้มเหลว", description: error.message });
    }
    toast({ title: "บันทึกแล้ว" });
    fetchAll();
  };

  const saveDisplayName = async (id: string, display_name: string) => {
    const { error } = await (supabase as any).from("profiles").update({ display_name }).eq("id", id);
    if (error) toast({ title: "บันทึกชื่อไม่สำเร็จ", description: error.message });
    else { toast({ title: "บันทึกแล้ว" }); fetchAll(); }
  };

  return (
    <div className="animate-fade-in">
      <Helmet>
        <title>ผู้ดูแลระบบ | จัดการสมาชิก</title>
        <meta name="description" content="หน้าผู้ดูแลระบบสำหรับจัดการสมาชิก อนุมัติ แก้ไขสิทธิ์" />
        <link rel="canonical" href={window.location.origin + "/admin"} />
      </Helmet>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>จัดการสมาชิก</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Input placeholder="ค้นหาจากอีเมลหรือชื่อ" value={filter} onChange={e=>setFilter(e.target.value)} className="max-w-xs" />
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchAll} disabled={loading}>รีเฟรช</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>อีเมล</TableHead>
                <TableHead>ชื่อแสดงผล</TableHead>
                <TableHead>อนุมัติ</TableHead>
                <TableHead>แอดมิน</TableHead>
                <TableHead className="text-right">บันทึก</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const isAdmin = (roles[p.id] || []).includes("admin");
                const [name, setName] = [p.display_name ?? "", undefined as any];
                return (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs sm:text-sm">{p.email}</TableCell>
                    <TableCell>
                      <input
                        defaultValue={p.display_name ?? ''}
                        onBlur={(e)=> saveDisplayName(p.id, e.target.value)}
                        className="w-full bg-transparent outline-none border-b border-transparent focus:border-[hsl(var(--brand-2))] transition-colors text-sm py-1"
                      />
                    </TableCell>
                    <TableCell>
                      <Switch checked={p.approved} onCheckedChange={(v)=>toggleApprove(p.id, !!v)} />
                    </TableCell>
                    <TableCell>
                      <Switch checked={isAdmin} onCheckedChange={(v)=>toggleAdmin(p.id, !!v)} />
                    </TableCell>
                    <TableCell className="text-right text-xs opacity-60">แก้ไขชื่อ: คลิกช่องแล้วออกเพื่อบันทึก</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
