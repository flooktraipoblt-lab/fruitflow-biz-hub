import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Plus, Pencil, Trash2, Save, AlertTriangle } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
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
interface BasketRow {
  id: string;
  basket_date: string;
  customer: string;
  basket_type: "mix" | "named";
  basket_name?: string | null;
  quantity: number;
  flow: "in" | "out";
}

export default function Baskets() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [customer, setCustomer] = useState("");
  const [type, setType] = useState<"mix" | "named">("mix");
  const [name, setName] = useState("");
  const [qty, setQty] = useState<number>(0);
  const [flow, setFlow] = useState<"in" | "out">("in");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Inline edit states for latest list
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQty, setEditingQty] = useState<number>(0);
  const [editingName, setEditingName] = useState<string>("");
  const [editingFlow, setEditingFlow] = useState<"in" | "out">("in");
  const [editingType, setEditingType] = useState<"mix" | "named">("mix");

  const { data: rows = [], refetch } = useQuery<BasketRow[]>({
    queryKey: ["baskets", page],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error } = await (supabase as any)
        .from("baskets")
        .select("id, basket_date, customer, basket_type, basket_name, quantity, flow")
        .order("basket_date", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return (data ?? []) as BasketRow[];
    },
  });

  const insertMutation = useMutation({
    mutationFn: async () => {
      if (!date || !customer || !qty) return;
      const payload = {
        basket_date: date.toISOString(),
        customer,
        basket_type: type,
        basket_name: type === "named" ? name : null,
        quantity: qty,
        flow,
      };
      const { error } = await (supabase as any).from("baskets").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      setName(""); setCustomer(""); setQty(0); setType("mix");
      refetch();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingId) return;
      const { error } = await (supabase as any)
        .from("baskets")
        .update({
          quantity: editingQty,
          basket_name: editingType === "named" ? editingName || null : null,
          flow: editingFlow,
        })
        .eq("id", editingId);
      if (error) throw error;
    },
    onSuccess: () => { setEditingId(null); refetch(); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from("baskets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { refetch(); },
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>ตะกร้า | Fruit Flow</title>
        <meta name="description" content="ติดตามตะกร้าบรรจุภัณฑ์ คงเหลือ/คงค้าง แยกตามลูกค้า" />
        <link rel="canonical" href={`${window.location.origin}/baskets`} />
      </Helmet>
      <h1 className="text-2xl font-bold">รายการตะกร้า</h1>

      <Card>
        <CardHeader>
          <CardTitle>เพิ่มรายการตะกร้า</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-5 items-end">
          <div className="grid gap-2">
            <Label>วันที่</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="justify-start">
                  <CalendarIcon className="mr-2" />
                  {date ? date.toLocaleDateString() : "เลือกวันที่"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={date} onSelect={setDate} className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label>ชื่อลูกค้า</Label>
            <Input placeholder="กรอกชื่อลูกค้า" value={customer} onChange={(e)=> setCustomer(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>ประเภทตะกร้า</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="mix">ตะกร้าฉับฉ่าย</SelectItem>
                <SelectItem value="named">ตะกร้าชื่อ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label>เข้า/ออก</Label>
            <Select value={flow} onValueChange={(v: any) => setFlow(v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือก" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="in">เข้า</SelectItem>
                <SelectItem value="out">ออก</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {type === "named" && (
            <div className="grid gap-2">
              <Label>ชื่อตะกร้า</Label>
              <Input placeholder="เช่น: กล้วยหอม A" value={name} onChange={(e)=> setName(e.target.value)} />
            </div>
          )}
          <div className="grid gap-2">
            <Label>จำนวน</Label>
            <Input type="number" value={qty} onChange={(e)=> setQty(Number(e.target.value))} />
          </div>
          <div className="md:col-span-5 flex gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button className="hover-scale"><Plus /> บันทึก</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertTriangle className="text-destructive animate-scale-in" />
                    ยืนยันการบันทึก
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    ต้องการบันทึกรายการตะกร้านี้หรือไม่?
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
            <Button variant="secondary" onClick={()=> { setName(""); setCustomer(""); setQty(0); setType("mix"); }}>รีเซ็ต</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการตะกร้าล่าสุด</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="w-full overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่</TableHead>
                  <TableHead>ชื่อลูกค้า</TableHead>
                  <TableHead>เข้า/ออก</TableHead>
                  <TableHead>ประเภทตะกร้า</TableHead>
                  <TableHead>ชื่อตะกร้า</TableHead>
                  <TableHead className="text-right">จำนวน</TableHead>
                  <TableHead className="text-right">การทำงาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>ยังไม่มีข้อมูล</TableCell>
                  </TableRow>
                ) : rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{new Date(r.basket_date).toLocaleDateString()}</TableCell>
                    <TableCell>{r.customer}</TableCell>
                    <TableCell>
                      {editingId === r.id ? (
                        <Select value={editingFlow} onValueChange={(v: any) => setEditingFlow(v)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-50 bg-background">
                            <SelectItem value="in">เข้า</SelectItem>
                            <SelectItem value="out">ออก</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        r.flow === "in" ? "เข้า" : "ออก"
                      )}
                    </TableCell>
                    <TableCell>
                      <span className={cn("rounded-full px-3 py-1 text-xs font-medium border",
                        r.basket_type === "named" ? "text-[hsl(var(--brand-2))] border-[hsl(var(--brand-2))]" : "text-[hsl(var(--brand-3))] border-[hsl(var(--brand-3))]")}>{r.basket_type === "named" ? "ตะกร้าชื่อ" : "ฉับฉ่าย"}</span>
                    </TableCell>
                    <TableCell>
                      {r.basket_type === "named" ? (
                        editingId === r.id ? (
                          <Input value={editingName} onChange={(e)=> setEditingName(e.target.value)} />
                        ) : (r.basket_name || "-")
                      ) : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {editingId === r.id ? (
                        <Input className="w-24 ml-auto" type="number" value={editingQty} onChange={(e)=> setEditingQty(Number(e.target.value))} />
                      ) : r.quantity}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {editingId === r.id ? (
                        <>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" className="gap-1 hover-scale"><Save className="h-4 w-4" /> บันทึก</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="text-destructive animate-scale-in" />
                                  ยืนยันการแก้ไข
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ต้องการบันทึกการแก้ไขรายการนี้หรือไม่?
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
                          <Button
                            size="sm"
                            variant="outline"
                            aria-label="แก้ไข"
                            className="hover-scale"
                            onClick={()=> { setEditingId(r.id); setEditingQty(r.quantity); setEditingName(r.basket_name || ""); setEditingFlow(r.flow); setEditingType(r.basket_type); }}
                          >
                            <Pencil />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" aria-label="ลบ" className="hover-scale">
                                <Trash2 />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle className="flex items-center gap-2">
                                  <AlertTriangle className="text-destructive animate-scale-in" />
                                  ยืนยันการลบ
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  ลบรายการนี้ถาวรหรือไม่? ไม่สามารถกู้คืนได้
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>ยกเลิก</AlertDialogCancel>
                                <AlertDialogAction onClick={()=> deleteMutation.mutate(r.id)} className="gap-2">
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
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" disabled={page===1} onClick={()=> setPage((p)=> Math.max(1, p-1))}>ก่อนหน้า</Button>
            <Button variant="outline" onClick={()=> setPage((p)=> p+1)}>ถัดไป</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
