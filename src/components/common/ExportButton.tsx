import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface ExportButtonProps<T> {
  data: T[];
  filename?: string;
  className?: string;
}

export function ExportButton<T>({ data, filename = "export.csv", className }: ExportButtonProps<T>) {
  const handleExport = () => {
    if (!data || data.length === 0) return;
    const keys = Object.keys(data[0] as any);
    const csv = [keys.join(","), ...data.map((row: any) => keys.map((k) => JSON.stringify(row[k] ?? "")).join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button size="sm" variant="outline" onClick={handleExport} className={className} aria-label="Export CSV">
      <Download />
      Export
    </Button>
  );
}
