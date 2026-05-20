import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Search, User, Pencil, Trash2, Save, Plus, AlertTriangle, Users, UserPlus, ChevronLeft, ChevronRight } from "lucide-react";
import { LoadingTable } from "@/components/common/LoadingTable";

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
  const [currentPage, setCurrentPage] = useState(1);

  const { customerNames } = useAutocompleteData();
  const itemsPerPage = 20;

  const { data: customers = [], isLoading, refetch } = useQuery<Customer[]>({
    queryKey: ["customers"],
    queryFn: async () => {
      // Paginated fetch to bypass Supabase 1000-row default
      const pageSize = 1000;
      let from = 0;
      const all: Customer[] = [];
      while (true) {
        const { data, error } = await (supabase as any)
          .from("customers")
          .select("id, name, phone, tags, note, created_at")
          .order("created_at", { ascending: false })
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const batch = (data ?? []) as Customer[];
        all.push(...batch);
        if (batch.length < pageSize) break;
        from += pageSize;
      }
      return all;
    },
  });

  // Deduplicate by name + phone (case-insensitive), keeping the most recent record
  const uniqueCustomers = useMemo(() => {
    const seen = new Map<string, Customer>();
    for (const c of customers) {
      const key = `${(c.name || "").trim().toLowerCase()}|${(c.phone || "").trim()}`;
      if (!seen.has(key)) seen.set(key, c);
    }
    return Array.from(seen.values());
  }, [customers]);

  const filtered = useMemo(() => uniqueCustomers.filter(c =>
    (!q || c.name.toLowerCase().includes(q.toLowerCase()) || (c.phone ?? "").includes(q))
  ), [uniqueCustomers, q]);

  // Paginated customers
  const paginatedCustomers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filtered.slice(startIndex, startIndex + itemsPerPage);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage);

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
    <div className="space-y-6 animate-fade-in p-4 md:p-6 min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <Helmet>
        <title>ลูกค้า | Fruit Flow</title>
        <meta name="description" content="รายชื่อลูกค้า พร้อมค้นหา เพิ่ม แก้ไข ลบ" />
        <link rel="canonical" href={`${window.location.origin}/customers`} />
      </Helmet>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-7 w-7 text-primary" />
            ลูกค้า
          </h1>
          <p className="text-sm text-muted-foreground mt-1">จัดการรายชื่อลูกค้า เบอร์โทร และแท็กของคุณ</p>
        </div>
        <div className="flex gap-3">
          <Card className="border-0 shadow-sm bg-gradient-to-br from-primary/10 to-primary/5 min-w-[140px]">
            <CardContent className="p-3 px-4">
              <p className="text-xs text-muted-foreground">ทั้งหมด</p>
              <p className="text-2xl font-bold text-primary">{uniqueCustomers.length}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm min-w-[140px]">
            <CardContent className="p-3 px-4">
              <p className="text-xs text-muted-foreground">ผลการค้นหา</p>
              <p className="text-2xl font-bold text-foreground">{filtered.length}</p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/30">
          <CardTitle className="text-base flex items-center gap-2"><UserPlus className="h-4 w-4" />เพิ่มลูกค้าใหม่</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-4 items-end">
          <div className="grid gap-2">
            <label className="text-sm font-medium">ชื่อลูกค้า</label>
            <Autocomplete
              value={name}
              onValueChange={setName}
              options={customerNames}
              placeholder="ค้นหาหรือกรอกชื่อลูกค้า"
              emptyText="ไม่พบลูกค้า"
            />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">โทรศัพท์</label>
            <Input placeholder="เช่น: 0801234567" value={phone} onChange={(e)=> setPhone(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <label className="text-sm font-medium">แท็ก (คั่นด้วย ,)</label>
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

      <Card className="border-0 shadow-sm">
        <CardHeader className="border-b bg-muted/30 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />รายการลูกค้า</CardTitle>
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9 h-9" placeholder="ค้นหาชื่อหรือเบอร์" value={q} onChange={(e)=> { setQ(e.target.value); setCurrentPage(1); }} />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="font-semibold">ชื่อ</TableHead>
                  <TableHead className="font-semibold">โทรศัพท์</TableHead>
                  <TableHead className="font-semibold">แท็ก</TableHead>
                  <TableHead className="text-right font-semibold">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={4}>
                      <LoadingTable columns={4} rows={5} />
                    </TableCell>
                  </TableRow>
                ) : paginatedCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-10 text-muted-foreground">ไม่พบข้อมูล</TableCell>
                  </TableRow>
                ) : paginatedCustomers.map((c) => (
                  <TableRow key={c.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">
                      {editingId === c.id ? (
                        <Input value={editingName} onChange={(e)=> setEditingName(e.target.value)} />
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                            {c.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{c.name}</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {editingId === c.id ? (
                        <Input value={editingPhone} onChange={(e)=> setEditingPhone(e.target.value)} />
                      ) : (c.phone || "-")}
                    </TableCell>
                    <TableCell className="space-x-1">
                      {Array.isArray(c.tags) && c.tags.length > 0 ? c.tags.map((t, i) => (
                        <Badge key={i} variant="secondary" className="hover-scale">{t}</Badge>
                      )) : <span className="text-muted-foreground">-</span>}
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

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 py-2">
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(currentPage - 1)}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> ก่อนหน้า
          </Button>
          <div className="text-sm flex items-center gap-1.5">
            <span className="text-muted-foreground">หน้า</span>
            <span className="font-bold text-primary">{currentPage}</span>
            <span className="text-muted-foreground">จาก</span>
            <span className="font-bold text-primary">{totalPages}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(currentPage + 1)}
            className="gap-1"
          >
            ถัดไป <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
