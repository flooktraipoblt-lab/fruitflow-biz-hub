import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { useMailbox } from "@/hooks/useMailbox";

export default function MailboxAlertListener() {
  const { messages } = useMailbox();
  const { toast } = useToast();
  const prevCount = useRef<number>(messages.length);
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      prevCount.current = messages.length;
      return;
    }
    if (messages.length > prevCount.current) {
      const newCount = messages.length - prevCount.current;
      toast({
        title: "มีข้อความใหม่ในกล่องจดหมาย",
        description: `เข้ามาใหม่ ${newCount} ข้อความ`,
      });
    }
    prevCount.current = messages.length;
  }, [messages.length, toast]);

  return null;
}
