import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type MailMessage = {
  id: string;
  title: string;
  sender: string;
  items?: string; // รายการ/รายละเอียดแบบย่อ
  body?: string;  // เนื้อหาเต็ม (ถ้ามี)
  createdAt: string; // ISO string
  read?: boolean;   // สถานะอ่านแล้ว
};

const STORAGE_KEY_MSGS = "mailbox_messages";
const STORAGE_KEY_WEBHOOK = "zapier_webhook_url"; // คงไว้เพื่อความเข้ากันได้ย้อนหลัง (แม้ UI จะไม่ได้ใช้)

function normalizeMessages(arr: MailMessage[]): MailMessage[] {
  return (arr || [])
    .map((m) => ({ ...m, read: Boolean(m.read) }))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

function loadMessages(): MailMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_MSGS);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MailMessage[];
    return normalizeMessages(parsed);
  } catch {
    return [];
  }
}

function saveMessages(msgs: MailMessage[]) {
  localStorage.setItem(STORAGE_KEY_MSGS, JSON.stringify(msgs));
}

export function useMailbox() {
  const [messages, setMessages] = useState<MailMessage[]>([]);
  const [webhookUrl, setWebhookUrlState] = useState<string>(() => localStorage.getItem(STORAGE_KEY_WEBHOOK) || "");

  // โหลดข้อมูลจาก Supabase และ localStorage
  const loadAllMessages = useCallback(async () => {
    try {
      // โหลดจาก Supabase
      const { data: supabaseMessages, error } = await (supabase as any)
        .from("mailbox_messages")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && supabaseMessages) {
        const mappedMessages: MailMessage[] = supabaseMessages.map((msg: any) => ({
          id: msg.id,
          title: `ข้อมูล Fruitflow ${new Date(msg.created_at).toLocaleDateString('th-TH')}`,
          sender: msg.sender || "ไม่ระบุ",
          items: msg.items || "",
          body: "",
          createdAt: msg.created_at,
          read: msg.read || false,
        }));

        // รวมกับข้อมูลจาก localStorage
        const localMessages = loadMessages();
        const allMessages = [...mappedMessages, ...localMessages];
        
        // ลบ duplicate messages โดยใช้ sender + items + createdAt เป็น key
        const uniqueMessages = allMessages.filter((msg, index, arr) => {
          const key = `${msg.sender}-${msg.items}-${msg.createdAt}`;
          return arr.findIndex(m => `${m.sender}-${m.items}-${m.createdAt}` === key) === index;
        });

        const sortedMessages = normalizeMessages(uniqueMessages);
        setMessages(sortedMessages);
        saveMessages(sortedMessages); // sync กลับไป localStorage
      } else {
        // ถ้า Supabase error ใช้ localStorage
        setMessages(loadMessages());
      }
    } catch (error) {
      console.log("Error loading messages:", error);
      setMessages(loadMessages());
    }
  }, []);

  useEffect(() => {
    loadAllMessages();
  }, [loadAllMessages]);

  // Auto-refresh messages from Supabase และ localStorage every 15 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      loadAllMessages();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadAllMessages]);

  const unseenCount = useMemo(() => messages.filter((m) => !m.read).length, [messages]);

  const setWebhookUrl = useCallback((url: string) => {
    setWebhookUrlState(url);
    localStorage.setItem(STORAGE_KEY_WEBHOOK, url);
  }, []);

  const addMessage = useCallback(async (partial: Omit<MailMessage, "id" | "createdAt"> & Partial<Pick<MailMessage, "createdAt">>) => {
    const msg: MailMessage = {
      id: crypto.randomUUID(),
      createdAt: partial.createdAt || new Date().toISOString(),
      title: partial.title,
      sender: partial.sender,
      items: partial.items,
      body: partial.body,
      read: false,
    };

    // บันทึกลง Supabase
    try {
      await (supabase as any).from("mailbox_messages").insert({
        id: msg.id,
        sender: msg.sender,
        items: msg.items || "",
        read: false,
        created_at: msg.createdAt,
      });
    } catch (error) {
      console.log("Error saving to Supabase:", error);
    }

    // บันทึกลง localStorage
    setMessages((prev) => {
      const next = [msg, ...prev].slice(0, 200); // เก็บสูงสุด 200 รายการ
      saveMessages(next);
      return next;
    });
    return msg;
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    saveMessages([]);
  }, []);

  const markAllRead = useCallback(async () => {
    let newlyRead: MailMessage[] = [];
    setMessages((prev) => {
      newlyRead = prev.filter((m) => !m.read);
      const next = prev.map((m) => ({ ...m, read: true }));
      saveMessages(next);
      return next;
    });
    if (newlyRead.length > 0) {
      try {
        const payload = newlyRead.map((m) => ({
          message_at: m.createdAt,
          sender: m.sender || "ไม่ระบุ",
          items: m.items || "",
        }));
        await (supabase as any).from("mailbox_read_history").insert(payload);
      } catch (error) {
        console.log("Error saving read history:", error);
      }
    }
  }, []);

  const markRead = useCallback(async (id: string) => {
    let target: MailMessage | undefined;

    // อัปเดตใน Supabase
    try {
      await (supabase as any).from("mailbox_messages").update({ read: true }).eq("id", id);
    } catch (error) {
      console.log("Error updating read status in Supabase:", error);
    }

    // อัปเดตใน localStorage
    setMessages((prev) => {
      target = prev.find((m) => m.id === id);
      const next = prev.map((m) => (m.id === id ? { ...m, read: true } : m));
      saveMessages(next);
      return next;
    });

    // บันทึกประวัติการอ่าน
    if (target) {
      try {
        await (supabase as any).from("mailbox_read_history").insert({
          message_at: target.createdAt,
          sender: target.sender || "ไม่ระบุ",
          items: target.items || "",
        });
      } catch (error) {
        console.log("Error saving read history:", error);
      }
    }
  }, []);

  const deleteMessage = useCallback(async (id: string) => {
    // ลบจาก Supabase
    try {
      await (supabase as any).from("mailbox_messages").delete().eq("id", id);
    } catch (error) {
      console.log("Error deleting from Supabase:", error);
    }

    // ลบจาก localStorage
    setMessages((prev) => {
      const next = prev.filter((m) => m.id !== id);
      saveMessages(next);
      return next;
    });
  }, []);

  return {
    messages,
    unseenCount,
    // คงไว้เพื่อการขยายในอนาคต/ความเข้ากันได้ย้อนหลัง
    webhookUrl,
    setWebhookUrl,

    addMessage,
    clearMessages,

    markAllRead,
    markRead,
    deleteMessage,
  } as const;
}