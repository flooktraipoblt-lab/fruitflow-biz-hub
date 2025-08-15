import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar as CalendarIcon, ListPlus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { useMailbox } from "@/hooks/useMailbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

// Template type stored in localStorage
type TemplateItem = { id: string; name: string; text: string };
const TEMPLATES_KEY = "mailbox_templates";

function loadTemplates(): TemplateItem[] {
  try {
    const raw = localStorage.getItem(TEMPLATES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as TemplateItem[];
    return arr;
  } catch {
    return [];
  }
}

function saveTemplates(list: TemplateItem[]) {
  localStorage.setItem(TEMPLATES_KEY, JSON.stringify(list));
}

export default function SubmitMailbox() {
  const { addMessage } = useMailbox();

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [items, setItems] = useState("");
  const [name, setName] = useState("");

  const [successOpen, setSuccessOpen] = useState(false);
  const [tplOpen, setTplOpen] = useState(false);

  const [templates, setTemplates] = useState<TemplateItem[]>(() => loadTemplates());
  const [tplName, setTplName] = useState("");
  const [tplText, setTplText] = useState("");

  useEffect(() => {
    saveTemplates(templates);
  }, [templates]);

  const dateLabel = useMemo(() => (date ? format(date, "PPP", { locale: th }) : "เลือกวันที่"), [date]);

  const handleAppendTemplate = (text: string) => {
    // Append text to existing content without removing previous content
    setItems((prev) => (prev ? prev + "\n" + text : text));
    setTplOpen(false);
  };

  const handleSaveTemplate = () => {
    if (!tplName.trim() || !tplText.trim()) return;
    const newItem: TemplateItem = { id: crypto.randomUUID(), name: tplName.trim(), text: tplText.trim() };
    setTemplates((prev) => [newItem, ...prev].slice(0, 100));
    setTplName("");
    setTplText("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const d = date || new Date();
    const title = `ข้อมูล Fruitflow ${format(d, "dd/MM/yyyy", { locale: th })}`;
    addMessage({ title, sender: name || "ผู้ใช้", items, createdAt: d.toISOString() });
    setItems("");
    setName("");
    setDate(new Date());
    setSuccessOpen(true);
  };

  const handleReset = () => {
    setItems("");
    setName("");
    setDate(new Date());
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Helmet>
        <title>ส่งข้อมูล Fruitflow | Fruit Flow</title>
        <meta name="description" content="ส่งข้อมูลเพื่อแสดงใน Mailbox — วันที่ รายการ และชื่อผู้กรอก" />
        <link rel="canonical" href={`${window.location.origin}/submit`} />
      </Helmet>

      <h1 className="text-xl font-bold">ส่งข้อมูล Fruitflow</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>แบบฟอร์ม</CardTitle>
          <CardDescription>บีบอัดให้เล็ก เบา และใช้งานง่าย</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              <Label>วันที่</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-[240px] justify-start text-left font-normal")}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateLabel}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                    locale={th as any}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="items" className="flex items-center gap-2">
                  <ListPlus className="h-4 w-4" /> รายการ
                </Label>
                <Dialog open={tplOpen} onOpenChange={setTplOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" className="bg-[hsl(var(--positive))] text-[hsl(var(--primary-foreground))] hover:opacity-90">เพิ่ม</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                      <DialogTitle>แม่แบบรายการ</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4">
                      <section className="space-y-2">
                        <div className="text-sm font-medium">เลือกแม่แบบที่บันทึกไว้</div>
                        <div className="grid gap-2 max-h-48 overflow-auto">
                          {templates.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => handleAppendTemplate(t.text)}
                              className="rounded-md border p-2 text-left hover:bg-muted transition"
                            >
                              <div className="font-medium">{t.name}</div>
                              <div className="text-xs text-muted-foreground line-clamp-2">{t.text}</div>
                            </button>
                          ))}
                          {templates.length === 0 && (
                            <div className="text-xs text-muted-foreground">ยังไม่มีแม่แบบ</div>
                          )}
                        </div>
                      </section>

                      <section className="space-y-2">
                        <div className="text-sm font-medium">เพิ่มข้อมูลแม่แบบ</div>
                        <div className="grid gap-2">
                          <Input placeholder="ชื่อแม่แบบ" value={tplName} onChange={(e) => setTplName(e.target.value)} />
                          <Textarea
                            placeholder="ข้อความแม่แบบ"
                            value={tplText}
                            onChange={(e) => setTplText(e.target.value)}
                            className="min-h-[120px]"
                            maxLength={1000}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button type="button" variant="secondary" onClick={handleSaveTemplate}>บันทึกแม่แบบ</Button>
                        </div>
                      </section>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Textarea
                id="items"
                placeholder="พิมพ์รายละเอียดรายการ..."
                value={items}
                onChange={(e) => setItems(e.target.value.slice(0, 1000))}
                className="min-h-[160px]"
                maxLength={1000}
              />
              <div className="text-xs text-muted-foreground text-right">{items.length}/1000</div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="name">ชื่อผู้กรอก</Label>
              <Input id="name" placeholder="เช่น สมชาย" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="flex items-center gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleReset}>รีเซ็ต</Button>
              <Button type="submit">
                <CheckCircle2 className="mr-2 h-4 w-4" /> ส่งข้อมูล
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <AlertDialog open={successOpen} onOpenChange={setSuccessOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ส่งข้อมูลสำเร็จ</AlertDialogTitle>
            <AlertDialogDescription>ข้อมูลถูกบันทึกลง Mailbox แล้ว</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction autoFocus>ตกลง</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
