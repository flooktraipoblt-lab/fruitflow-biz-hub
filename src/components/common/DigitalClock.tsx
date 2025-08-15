import { useEffect, useState } from "react";

export default function DigitalClock() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border bg-card px-4 py-2 shadow-sm">
      <span className="text-xs text-muted-foreground">เวลาปัจจุบัน</span>
      <span className="font-mono text-2xl tracking-widest bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] bg-clip-text text-transparent">
        {hh}:{mm}:{ss}
      </span>
    </div>
  );
}
