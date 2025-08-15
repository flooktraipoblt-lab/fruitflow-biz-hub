import { useState } from "react";
import { Mail, CheckCheck, Trash2, CircleDot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useMailbox } from "@/hooks/useMailbox";

export default function Mailbox() {
  const { toast } = useToast();
  const { messages, unseenCount, markAllRead, markRead, deleteMessage } = useMailbox();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Mailbox" className="relative">
          <Mail className="h-7 w-7 text-[hsl(var(--brand-3))]" />
          {unseenCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[hsl(var(--brand-3))] text-[10px] text-[hsl(var(--primary-foreground))]">
              {unseenCount > 9 ? "9+" : unseenCount}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Mailbox</DialogTitle>
          <DialogDescription>รับและแสดงข้อความที่เข้ามา</DialogDescription>
        </DialogHeader>

        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium">กล่องข้อความ</div>
            <Badge variant="secondary">ทั้งหมด {messages.length}</Badge>
          </div>
          <ScrollArea className="h-72 rounded-md border p-2">
            <ul className="space-y-2">
              {messages.map((m) => {
                const dt = new Date(m.createdAt);
                return (
                  <li key={m.id} className="rounded-md border p-3">
                    <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {!m.read && <CircleDot className="h-3 w-3 text-[hsl(var(--brand-3))]" />}
                            <Badge variant="secondary">
                              {new Intl.DateTimeFormat("th-TH", { year: "numeric", month: "2-digit", day: "2-digit" }).format(dt)}
                            </Badge>
                            <div className="truncate">
                              <span className="text-xs text-muted-foreground">ผู้ส่ง:</span>{" "}
                              <span className="font-medium break-words">{m.sender || "ไม่ระบุ"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {m.items && (
                            <Button
                              variant="outline"
                              size="sm"
                              aria-expanded={!!expanded[m.id]}
                              onClick={() => setExpanded((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                            >
                              {expanded[m.id] ? "ย่อ" : "เพิ่มเติม"}
                            </Button>
                          )}
                          {!m.read && (
                            <Button
                              variant="secondary"
                              size="icon"
                              aria-label="อ่านแล้ว"
                              onClick={() => {
                                markRead(m.id);
                                toast({ title: "ทำเครื่องหมายว่าอ่านแล้ว", description: m.sender || "ข้อความ" });
                              }}
                            >
                              <CheckCheck className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="destructive"
                            size="icon"
                            aria-label="ลบ"
                            onClick={() => {
                              deleteMessage(m.id);
                              toast({ title: "ลบแล้ว", description: m.sender || "ข้อความ" });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                    </div>
                    {expanded[m.id] && m.items && (
                      <div className="mt-2">
                        <div className="text-xs text-muted-foreground mb-1">รายการ</div>
                        <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {m.items}
                        </div>
                      </div>
                    )}
                  </li>
                );
              })}
              {messages.length === 0 && (
                <li className="text-sm text-muted-foreground">ยังไม่มีข้อความ</li>
              )}
            </ul>
          </ScrollArea>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={markAllRead}>ทำเครื่องหมายว่าอ่านแล้วทั้งหมด</Button>
          </div>
        </section>
      </DialogContent>
    </Dialog>
  );
}
