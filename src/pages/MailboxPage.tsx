import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useMailbox } from "@/hooks/useMailbox";

export default function MailboxPage() {
  const { messages } = useMailbox();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) =>
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
     <div className="animate-fade-in">
      <Helmet>
        <title>Mailbox: วันที่และชื่อผู้ส่ง</title>
        <meta name="description" content="รับและแสดงข้อความ Mailbox แสดงวันที่และชื่อผู้ส่ง กดเพิ่มเติมเพื่อดูรายการ" />
        <link rel="canonical" href="/mailbox" />
      </Helmet>

      <header className="mb-4">
        <h1 className="text-2xl font-semibold tracking-tight">Mailbox แสดงวันที่และชื่อผู้ส่ง</h1>
        <p className="text-sm text-muted-foreground mt-1">กด “เพิ่มเติม” เพื่อดูรายการที่ส่งมา (จัดวางตามต้นฉบับ)</p>
      </header>

      <main>
        <section aria-label="Mailbox list" className="space-y-3">
          {messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">ยังไม่มีข้อความ</p>
          ) : (
            <ul className="space-y-3">
              {messages.map((m) => {
                const dt = new Date(m.createdAt);
                const dateStr = new Intl.DateTimeFormat("th-TH", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                }).format(dt);
                return (
                  <li key={m.id}>
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{dateStr}</Badge>
                            <div className="truncate">
                              <span className="text-sm text-muted-foreground">ผู้ส่ง:</span>{" "}
                              <span className="font-medium break-words">{m.sender || "ไม่ระบุ"}</span>
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            aria-expanded={!!expanded[m.id]}
                            onClick={() => toggle(m.id)}
                          >
                            {expanded[m.id] ? "ย่อ" : "เพิ่มเติม"}
                          </Button>
                        </div>
                      </div>

                      {expanded[m.id] && m.items && (
                        <div className="mt-3">
                          <div className="text-sm text-muted-foreground mb-1">รายการ</div>
                          <div className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {m.items}
                          </div>
                        </div>
                      )}
                    </Card>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
