import { Helmet } from "react-helmet-async";
import { useMemo, useState, useEffect, useRef } from "react";
import { Autocomplete } from "@/components/ui/autocomplete";
import { useAutocompleteData } from "@/hooks/useAutocompleteData";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface ItemRow {
  id: string;
  name: string;
  qty: number | "";
  weight: number | "";
  fraction: number | "";
  price: number | "";
}

export default function CreateBill() {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [customer, setCustomer] = useState("");
  const [customerSug, setCustomerSug] = useState<string[]>([]);
  const [showCustomerSug, setShowCustomerSug] = useState(false);
  const [type, setType] = useState<"buy" | "sell">("sell");
  const [originalType, setOriginalType] = useState<"buy" | "sell" | false>(false); // เก็บค่าเดิมสำหรับเปรียบเทียบ
  const [items, setItems] = useState<ItemRow[]>([{ id: crypto.randomUUID(), name: "", qty: "", weight: "", fraction: "", price: "" }]);
  const [basketType, setBasketType] = useState<"mix" | "named">("mix");
  const [basketName, setBasketName] = useState("");
  const [basketQty, setBasketQty] = useState<number | "">("");
  const [deductBasket, setDeductBasket] = useState<boolean>(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const billId = searchParams.get("id");
  const [confirmAddCustomerOpen, setConfirmAddCustomerOpen] = useState(false);
  const pendingActionRef = useRef<null | (() => Promise<void>)>(null);

  const { customerNames, basketNames, itemNames } = useAutocompleteData();

  useEffect(() => {
    const load = async () => {
      if (!billId) return;
      try {
        const { data: bill, error: billErr } = await (supabase as any)
          .from("bills")
          .select("id, bill_date, customer, type, total, status")
          .eq("id", billId)
          .maybeSingle();
        if (billErr) throw billErr;
        if (bill) {
          setDate(bill.bill_date ? new Date(bill.bill_date) : new Date());
          setCustomer(bill.customer ?? "");
          const currentType = (bill.type as "buy" | "sell") ?? "sell";
          setType(currentType);
          setOriginalType(currentType); // เก็บค่าเดิมไว้
        }
        // Load bill items
        const { data: itemsData, error: itemsErr } = await (supabase as any)
          .from("bill_items")
          .select("id, name, qty, weight, fraction, price")
          .eq("bill_id", billId)
          .order("created_at", { ascending: true });
        if (itemsErr) throw itemsErr;
        if (itemsData && itemsData.length > 0) {
          setItems(itemsData.map((it: any) => ({
            id: it.id,
            name: it.name ?? "",
            qty: it.qty ?? "",
            weight: it.weight ?? "",
            fraction: it.fraction ?? "",
            price: it.price ?? "",
          })));
        } else {
          setItems([{ id: crypto.randomUUID(), name: "", qty: "", weight: "", fraction: "", price: "" }]);
        }
        // Load packaging info
        const { data: pack, error: packErr } = await (supabase as any)
          .from("bill_packaging")
          .select("basket_type, basket_name, quantity, deduct")
          .eq("bill_id", billId)
          .maybeSingle();
        if (packErr) throw packErr;
        if (pack) {
          setBasketType((pack.basket_type as "mix" | "named") ?? "mix");
          setBasketName(pack.basket_name ?? "");
          setBasketQty(pack.quantity ?? 0);
          setDeductBasket(!!pack.deduct);
        } else {
          setBasketType("mix");
          setBasketName("");
          setBasketQty("");
          setDeductBasket(true);
        }
      } catch (error: any) {
        toast({ title: "โหลดบิลไม่สำเร็จ", description: error.message });
      }
    };
    load();
  }, [billId, toast]);

  // Fetch customer suggestions
  useEffect(() => {
    const fetchSug = async () => {
      if (!customer) { setCustomerSug([]); return; }
      const { data } = await (supabase as any)
        .from("customers")
        .select("name")
        .ilike("name", `%${customer}%`)
        .limit(5);
      setCustomerSug(Array.from(new Set((data ?? []).map((r: any) => r.name).filter(Boolean))));
    };
    fetchSug();
  }, [customer]);

  const totals = useMemo(() => {
    const rows = items.map((it) => {
      const qty = Number(it.qty) || 0;
      const weight = Number(it.weight) || 0;
      const fraction = Number(it.fraction) || 0;
      const price = Number(it.price) || 0;
      const totalWeight = qty * weight + fraction;
      const amount = totalWeight * price;
      return { ...it, totalWeight, amount } as any;
    });
    const grand = rows.reduce((acc: number, r: any) => acc + r.amount, 0);
    return { rows, grand };
  }, [items]);

  const onSave = async () => {
    if (!customer) {
      toast({ title: "กรอกชื่อลูกค้า" });
      return;
    }
    if (!date) {
      toast({ title: "เลือกวันที่" });
      return;
    }
    // 1) Create bill
    const { data: newBill, error: billErr } = await (supabase as any)
      .from("bills")
      .insert({
        bill_date: date.toISOString(),
        customer,
        type,
        total: totals.grand,
        status: "due",
      })
      .select("id")
      .maybeSingle();
    if (billErr || !newBill) {
      toast({ title: "บันทึกไม่สำเร็จ", description: (billErr as any)?.message || "ไม่สามารถสร้างบิลได้" });
      return;
    }

    // 2) Insert bill items
    const itemsToInsert = items
      .filter((it) => (it.name && it.name.trim() !== "") || Number(it.qty) || Number(it.weight) || Number(it.fraction) || Number(it.price))
      .map((it) => ({
        bill_id: newBill.id,
        name: it.name || "",
        qty: Number(it.qty) || 0,
        weight: Number(it.weight) || 0,
        fraction: Number(it.fraction) || 0,
        price: Number(it.price) || 0,
      }));
    if (itemsToInsert.length > 0) {
      const { error: itemsErr } = await (supabase as any).from("bill_items").insert(itemsToInsert);
      if (itemsErr) {
        toast({ title: "บันทึกรายการสินค้าไม่สำเร็จ", description: itemsErr.message });
        return;
      }
    }

    // 3) Insert packaging info (only if quantity > 0)
    const shouldInsertPack = Number(basketQty) > 0;
    if (shouldInsertPack) {
      const { error: packErr } = await (supabase as any).from("bill_packaging").insert({
        bill_id: newBill.id,
        basket_type: basketType,
        basket_name: basketType === "named" ? (basketName || null) : null,
        quantity: Number(basketQty),
        deduct: !!deductBasket,
      });
      if (packErr) {
        toast({ title: "บันทึกตะกร้าไม่สำเร็จ", description: packErr.message });
        return;
      }
    }

    // 4) Mirror to baskets if sell bill and has packaging info
    if (type === "sell" && shouldInsertPack) {
      await (supabase as any).from("baskets").insert({
        bill_id: newBill.id,
        basket_date: date.toISOString(),
        customer,
        basket_type: basketType,
        basket_name: basketType === "named" ? (basketName || null) : null,
        quantity: Number(basketQty),
        flow: deductBasket ? "out" : "in",
      });
    }

    // 5) Send data to webhook
    try {
      const webhookData = {
        bill_id: newBill.id,
        bill_date: date.toISOString(),
        customer,
        type,
        total: totals.grand,
        items: itemsToInsert,
        packaging: shouldInsertPack ? {
          basket_type: basketType,
          basket_name: basketType === "named" ? (basketName || null) : null,
          quantity: Number(basketQty),
          deduct: !!deductBasket,
        } : null,
        action: "create"
      };

      await fetch("https://n8n.srv929073.hstgr.cloud/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      // Send additional data to specified webhook
      await fetch("https://n8n.srv929073.hstgr.cloud/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...webhookData,
          timestamp: new Date().toISOString(),
          additionalInfo: "Create bill operation"
        }),
      });
    } catch (error) {
      console.log("Webhook error:", error);
      // Don't show error to user, webhook is optional
    }

    toast({ title: "บันทึกสำเร็จ", description: `จำนวนรายการ ${itemsToInsert.length}` });
    navigate("/bills");
  };

  const onSaveEdit = async () => {
    if (!billId) {
      toast({ title: "ไม่พบบิลสำหรับแก้ไข" });
      return;
    }
    if (!customer || !date) {
      toast({ title: "กรอกข้อมูลให้ครบ" });
      return;
    }

    // 1) Update bill
    const { error: billErr } = await (supabase as any)
      .from("bills")
      .update({
        bill_date: date.toISOString(),
        customer,
        type,
        total: totals.grand,
      })
      .eq("id", billId);
    if (billErr) {
      toast({ title: "บันทึกการแก้ไขไม่สำเร็จ", description: billErr.message });
      return;
    }

    // 2) Replace items
    const { error: delItemsErr } = await (supabase as any).from("bill_items").delete().eq("bill_id", billId);
    if (delItemsErr) {
      toast({ title: "ลบรายการสินค้าเดิมไม่สำเร็จ", description: delItemsErr.message });
      return;
    }
    const itemsToInsert = items
      .filter((it) => (it.name && it.name.trim() !== "") || Number(it.qty) || Number(it.weight) || Number(it.fraction) || Number(it.price))
      .map((it) => ({
        bill_id: billId,
        name: it.name || "",
        qty: Number(it.qty) || 0,
        weight: Number(it.weight) || 0,
        fraction: Number(it.fraction) || 0,
        price: Number(it.price) || 0,
      }));
    if (itemsToInsert.length > 0) {
      const { error: insItemsErr } = await (supabase as any).from("bill_items").insert(itemsToInsert);
      if (insItemsErr) {
        toast({ title: "บันทึกสินค้าที่แก้ไขไม่สำเร็จ", description: insItemsErr.message });
        return;
      }
    }

    // 3) Replace packaging
    const { error: delPackErr } = await (supabase as any).from("bill_packaging").delete().eq("bill_id", billId);
    if (delPackErr) {
      toast({ title: "ลบข้อมูลตะกร้าเดิมไม่สำเร็จ", description: delPackErr.message });
      return;
    }
    const shouldInsertPack = Number(basketQty) > 0;
    if (shouldInsertPack) {
      const { error: insPackErr } = await (supabase as any).from("bill_packaging").insert({
        bill_id: billId,
        basket_type: basketType,
        basket_name: basketType === "named" ? (basketName || null) : null,
        quantity: Number(basketQty),
        deduct: !!deductBasket,
      });
      if (insPackErr) {
        toast({ title: "บันทึกตะกร้าที่แก้ไขไม่สำเร็จ", description: insPackErr.message });
        return;
      }
    }

    // 4) Sync baskets history to reflect edits
    // Always remove previous basket records for this bill, then re-insert if needed
    await (supabase as any).from("baskets").delete().eq("bill_id", billId);
    if (type === "sell" && shouldInsertPack) {
      await (supabase as any).from("baskets").insert({
        bill_id: billId,
        basket_date: date.toISOString(),
        customer,
        basket_type: basketType,
        basket_name: basketType === "named" ? (basketName || null) : null,
        quantity: Number(basketQty),
        flow: deductBasket ? "out" : "in",
      });
    }

    // 5) Send data to webhook
    try {
      const webhookData = {
        bill_id: billId,
        bill_date: date.toISOString(),
        customer,
        type,
        original_type: originalType, // เพิ่มค่าเดิม
        type_changed: originalType !== false && originalType !== type, // แจ้งว่าเปลี่ยนแปลงหรือไม่
        total: totals.grand,
        items: itemsToInsert,
        packaging: shouldInsertPack ? {
          basket_type: basketType,
          basket_name: basketType === "named" ? (basketName || null) : null,
          quantity: Number(basketQty),
          deduct: !!deductBasket,
        } : null,
        action: "edit"
      };

      await fetch("https://n8n.srv929073.hstgr.cloud/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(webhookData),
      });

      // Send additional data to specified webhook
      await fetch("https://n8n.srv929073.hstgr.cloud/webhook/065b6aa9-db2a-4607-83fe-e5cc4ed93c6c", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...webhookData,
          timestamp: new Date().toISOString(),
          additionalInfo: "Edit bill operation"
        }),
      });
    } catch (error) {
      console.log("Webhook error:", error);
      // Don't show error to user, webhook is optional
    }

    toast({ title: "บันทึกการแก้ไขสำเร็จ" });
    navigate("/bills");
  };

  const addItem = () => setItems((s) => [...s, { id: crypto.randomUUID(), name: "", qty: "", weight: "", fraction: "", price: "" }]);
  const removeItem = (id: string) => setItems((s) => s.filter((x) => x.id !== id));

  // ตรวจสอบชื่อลูกค้าในฐานข้อมูล หากไม่พบให้ถามเพื่อเพิ่มก่อนบันทึก
  const checkCustomerAndProceed = async (proceed: () => Promise<void>) => {
    if (!customer) {
      toast({ title: "กรอกชื่อลูกค้า" });
      return;
    }
    const { data, error } = await (supabase as any)
      .from("customers")
      .select("id")
      .eq("name", customer)
      .maybeSingle();
    if (data?.id) {
      await proceed();
    } else {
      pendingActionRef.current = proceed;
      setConfirmAddCustomerOpen(true);
    }
  };

  const handleSave = async () => {
    await checkCustomerAndProceed(onSave);
  };

  const handleSaveEdit = async () => {
    await checkCustomerAndProceed(onSaveEdit);
  };

  const confirmAddCustomer = async () => {
    if (!customer) return;
    const { error } = await (supabase as any).from("customers").insert({ name: customer });
    if (error) {
      toast({ title: "เพิ่มลูกค้าไม่สำเร็จ", description: error.message });
      setConfirmAddCustomerOpen(false);
      pendingActionRef.current = null;
      return;
    }
    // เพิ่มลูกค้าสำเร็จ -> ดำเนินการบันทึกที่ค้างไว้
    setConfirmAddCustomerOpen(false);
    const action = pendingActionRef.current;
    pendingActionRef.current = null;
    if (action) await action();
  };

  const cancelAddCustomer = () => {
    setConfirmAddCustomerOpen(false);
    pendingActionRef.current = null;
  };

  const ensureCustomer = (name: string) => {
    setCustomer(name);
  };

  const ensureCustomerInDB = async (name: string) => {
    if (!name) return null;
    const { data: exist, error: existErr } = await (supabase as any)
      .from("customers").select("id").eq("name", name).maybeSingle();
    if (!existErr && exist?.id) return exist.id;
    const { data: created, error: insErr } = await (supabase as any)
      .from("customers").insert({ name }).select("id").maybeSingle();
    return insErr ? null : created?.id ?? null;
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Helmet>
        <title>สร้างบิล | Fruit Flow</title>
        <meta name="description" content="สร้างบิลซื้อ/ขาย กรอกรายการสินค้า คิดน้ำหนักรวมและยอดอัตโนมัติ" />
        <link rel="canonical" href={`${window.location.origin}/create`} />
      </Helmet>

      <h1 className="text-2xl font-bold">สร้างบิล</h1>

      <Card>
        <CardHeader>
          <CardTitle>ข้อมูลบิล</CardTitle>
          <CardDescription>กรอกข้อมูลหลักของบิล</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
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
                <Calendar mode="single" selected={date} onSelect={setDate} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label>ชื่อลูกค้า</Label>
            <Autocomplete
              value={customer}
              onValueChange={setCustomer}
              options={customerNames}
              placeholder="ค้นหาหรือกรอกชื่อลูกค้า"
              emptyText="ไม่พบลูกค้า"
            />
          </div>
          <div className="grid gap-2">
            <Label>ประเภทบิล</Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="buy">บิลซื้อ</SelectItem>
                <SelectItem value="sell">บิลขาย</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>รายการสินค้า</CardTitle>
          <CardDescription>น้ำหนักรวม = จำนวน x น้ำหนัก + เศษ | จำนวนเงิน = น้ำหนักรวม x ราคา</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totals.rows.map((row, idx) => (
            <div key={row.id} className="grid gap-2 md:grid-cols-8 items-end rounded-md border p-3">
              <div className="grid gap-1 md:col-span-2">
                <Label>ชื่อสินค้า</Label>
                <Autocomplete
                  value={row.name}
                  onValueChange={(value) => setItems((s) => s.map((x) => x.id === row.id ? { ...x, name: value } : x))}
                  options={itemNames}
                  placeholder="ค้นหาหรือกรอกชื่อสินค้า"
                  emptyText="ไม่พบสินค้า"
                />
              </div>
              <div className="grid gap-1">
                <Label>จำนวน</Label>
                <Input type="number" value={row.qty} onChange={(e) => setItems((s) => s.map((x) => x.id === row.id ? { ...x, qty: e.target.value === "" ? "" : Number(e.target.value) } : x))} placeholder="จำนวน" />
              </div>
              <div className="grid gap-1">
                <Label>น้ำหนัก</Label>
                <Input type="number" value={row.weight} onChange={(e) => setItems((s) => s.map((x) => x.id === row.id ? { ...x, weight: e.target.value === "" ? "" : Number(e.target.value) } : x))} placeholder="น้ำหนัก" />
              </div>
              <div className="grid gap-1">
                <Label>เศษ</Label>
                <Input type="number" value={row.fraction} onChange={(e) => setItems((s) => s.map((x) => x.id === row.id ? { ...x, fraction: e.target.value === "" ? "" : Number(e.target.value) } : x))} placeholder="เศษ" />
              </div>
              <div className="grid gap-1">
                <Label>น้ำหนักรวม (auto)</Label>
                <Input value={row.totalWeight.toFixed(2)} readOnly />
              </div>
              <div className="grid gap-1">
                <Label>ราคา</Label>
                <Input type="number" value={row.price} onChange={(e) => setItems((s) => s.map((x) => x.id === row.id ? { ...x, price: e.target.value === "" ? "" : Number(e.target.value) } : x))} placeholder="ราคา" />
              </div>
              <div className="grid gap-1">
                <Label>จำนวนเงิน (auto)</Label>
                <Input value={row.amount.toFixed(2)} readOnly />
              </div>
              <div className="flex justify-end md:col-span-8">
                <Button variant="destructive" size="sm" onClick={() => removeItem(row.id)} disabled={items.length === 1}><Trash2 /> ลบ</Button>
              </div>
            </div>
          ))}
          <div className="flex items-center justify-between">
            <Button variant="gradient" onClick={addItem}><Plus /> เพิ่มรายการ</Button>
            <div className="text-xl font-bold">ยอดรวม: ฿ {totals.grand.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>ตะกร้าบรรจุภัณฑ์</CardTitle>
          <CardDescription>บันทึกประเภทและจำนวนตะกร้า</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3 items-end">
          <div className="grid gap-2">
            <Label>ประเภทตะกร้า</Label>
            <Select value={basketType} onValueChange={(v: any) => setBasketType(v)}>
              <SelectTrigger>
                <SelectValue placeholder="เลือกประเภท" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-background">
                <SelectItem value="mix">ฉับฉ่าย</SelectItem>
                <SelectItem value="named">ตะกร้าชื่อ</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {basketType === "named" && (
            <div className="grid gap-2">
              <Label>ชื่อตะกร้า</Label>
              <Autocomplete
                value={basketName}
                onValueChange={setBasketName}
                options={basketNames}
                placeholder="ค้นหาหรือกรอกชื่อตะกร้า"
                emptyText="ไม่พบชื่อตะกร้า"
              />
            </div>
          )}
          <div className="grid gap-2">
            <Label>จำนวนตะกร้า</Label>
            <Input type="number" value={basketQty} onChange={(e) => setBasketQty(e.target.value === "" ? "" : Number(e.target.value))} placeholder="จำนวนตะกร้า" />
          </div>
          {type === "sell" && (
            <label className="md:col-span-3 inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={deductBasket} onChange={(e) => setDeductBasket(e.target.checked)} />
              หักลบตะกร้า (ออกของลูกค้า)
            </label>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center gap-2 justify-end">
        {billId ? (
          <Button variant="secondary" onClick={handleSaveEdit}>บันทึกการแก้ไข</Button>
        ) : null}
        <Button variant="gradient" onClick={billId ? handleSaveEdit : handleSave}>{billId ? "บันทึกการแก้ไข" : "บันทึก"}</Button>
      </div>

      <AlertDialog open={confirmAddCustomerOpen} onOpenChange={setConfirmAddCustomerOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>เพิ่มลูกค้าใหม่?</AlertDialogTitle>
            <AlertDialogDescription>
              ไม่พบบันทึกลูกค้าชื่อ "{customer}". ต้องการเพิ่มชื่อนี้เข้าในฐานข้อมูลลูกค้าหรือไม่
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelAddCustomer}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAddCustomer}>เพิ่มลูกค้าและบันทึก</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
