import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useAutocompleteData } from "@/hooks/useAutocompleteData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Search, User, Phone, Tags as TagsIcon, Pencil, Trash2, Save, Plus, AlertTriangle } from "lucide-react";
interface Customer {
  id: string;
  name: string;
  phone: string | null;
  tags?: string[] | null;
  note?: string | null;
  created_at?: string;
}

export default function Customers() {
  const [q, setQ] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPhone, setEditingPhone] = useState("");

  const { customerNames } = useAutocompleteData();

  const { data: customers = [], refetch } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("customers")
        .select("id, name, phone, tags, note, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Customer[];
    },
  });

  const filtered = useMemo(() => customers.filter(c =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? "").includes(q))
  ), [customers, q]);

  const insertMutation = useMutation({
    mutationFn: async () => {
      if (!name) return;
      const tags = tagsInput ? tagsInput.split(',').map(t=>t.trim()).filter(Boolean) : null;
      const { error } = await (supabase as any).from("customers").insert({ name, phone: phone || null, tags });
      if (error) throw error;
    },
  onSuccess: () => { setName(""); setPhone(""); setTagsInput(""); refetch(); },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await (supabase as any)
        .from("customers")
        .update({ name: editingName, phone: editingPhone || null })
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingId(null); refetch(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("customers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>ลูกค้า | Fruit Flow</title>
        <meta name="description" content="รายชื่อลูกค้า พร้อมค้นหา เพิ่ม แก้ไข ลบ" />
        <link rel="canonical" href={`${window.location.origin}/customers`} />
      </Helmet>
      <h1 className="text-2xl font-bold">ลูกค้า</h1>

      <Card>
        <CardHeader>
          <CardTitle>เพิ่มลูกค้า</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4 items-end">
          <div className="grid gap-2">
            <label>ชื่อลูกค้า</label>
            <Autocomplete
              value={name}
              onValueChange={setName}
              options={customerNames}
              placeholder="ค้นหาหรือกรอกชื่อลูกค้า"
              emptyText="ไม่พบลูกค้า"
            />
          </div>
          <div className="grid gap-2">
            <label>โทรศัพท์</label>
            <Input placeholder="เช่น: 0801234567" value={phone} onChange={(e)=> setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label>แท็ก (คั่นด้วย ,)</label>
            <Input placeholder="เช่น: ร้านค้า, VIP" value={tagsInput} onChange={(e)=> setTagsInput(e.target.value)} />
          </div>
          <div className="flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="gap-1 hover-scale"><Plus className="h-4 w-4" /> เพิ่ม</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive animate-scale-in" />
                    ยืนยันการเพิ่มลูกค้า
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    ต้องการเพิ่มลูกค้ารายใหม่นี้หรือไม่?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                  <AlertDialogAction onClick={()=> insertMutation.mutate()} className="gap-2">
                    <Save className="h-4 w-4 animate-fade-in" /> ยืนยัน
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button variant="secondary" onClick={()=> { setName(""); setPhone(""); }}>รีเซ็ต</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ค้นหาและรายการลูกค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="ค้นหาชื่อหรือเบอร์" value={q} onChange={(e)=> setQ(e.target.value)} />
            <div className="text-xs text-muted-foreground mt-2">พบ {filtered.length} รายการ</div>
          </div>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ชื่อ</TableHead>
                  <TableHead>โทรศัพท์</TableHead>
                  <TableHead>แท็ก</TableHead>
                  <TableHead className="text-right">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3}>ไม่พบข้อมูล</TableCell>
                  </TableRow>
                ) : filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      {editingId === c.id ? (
                        <Input value={editingName} onChange={(e)=> setEditingName(e.target.value)} />
                      ) : c.name}
                    </TableCell>
                    <TableCell>
                      {editingId === c.id ? (
                        <Input value={editingPhone} onChange={(e)=> setEditingPhone(e.target.value)} />
                      ) : (c.phone || "-")}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {Array.isArray(c.tags) && c.tags.length > 0 ? c.tags.map((t, i) => (
                        <Badge key={i} variant="secondary" className="hover-scale">{t}</Badge>
                      )) : '-'}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {editingId === c.id ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="gap-1 hover-scale"><Save className="h-4 w-4" /> บันทึก</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="text-destructive animate-scale-in" />
                                  ยืนยันการบันทึกการแก้ไข
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ต้องการบันทึกการแก้ไขลูกค้ารายนี้หรือไม่?
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={()=> updateMutation.mutate()} className="gap-2">
                                  <Save className="h-4 w-4 animate-fade-in" /> ยืนยัน
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button size="sm" variant="secondary" onClick={()=> setEditingId(null)}>ยกเลิก</Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" variant="outline" className="gap-1 hover-scale" onClick={()=> { setEditingId(c.id); setEditingName(c.name); setEditingPhone(c.phone || ""); }}>
                            <Pencil className="h-4 w-4" /> แก้ไข
                          </Button>
                          <Button size="sm" variant="secondary" className="gap-1 hover-scale" onClick={()=> window.location.assign(`/customers/${c.id}`)}>
                            <User className="h-4 w-4" /> โปรไฟล์
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="gap-1 hover-scale">
                                <Trash2 className="h-4 w-4" /> ลบ
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="text-destructive animate-scale-in" />
                                  ยืนยันการลบลูกค้า
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ลบลูกค้ารายนี้ถาวรหรือไม่? ไม่สามารถกู้คืนได้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={()=> deleteMutation.mutate(c.id)} className="gap-2">
                                  <Trash2 className="h-4 w-4 animate-fade-in" /> ยืนยันลบ
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
