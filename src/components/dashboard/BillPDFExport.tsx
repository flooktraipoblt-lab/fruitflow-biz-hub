import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { CalendarIcon, FileDown } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";

export function BillPDFExport() {
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const { data: bills = [] } = useQuery({
    queryKey: ["bills-export", fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select(`
          id,
          bill_no,
          bill_date,
          type,
          customer,
          total,
          status
        `)
        .gte("bill_date", fromDate.toISOString())
        .lte("bill_date", toDate.toISOString())
        .order("bill_date", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isDialogOpen,
  });

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      // Create a temporary container for the bill content
      const container = document.createElement("div");
      container.style.position = "absolute";
      container.style.left = "-9999px";
      container.style.width = "800px";
      container.style.padding = "40px";
      container.style.backgroundColor = "white";
      container.style.fontFamily = "sans-serif";
      
      const money = (n: number) => n.toLocaleString("th-TH", { minimumFractionDigits: 2 });
      
      const buyTotal = bills.filter((b: any) => b.type === "buy").reduce((sum: number, b: any) => sum + Number(b.total || 0), 0);
      const sellTotal = bills.filter((b: any) => b.type === "sell").reduce((sum: number, b: any) => sum + Number(b.total || 0), 0);
      
      container.innerHTML = `
        <div style="font-family: sans-serif;">
          <h1 style="text-align: center; margin-bottom: 20px;">รายงานบิล</h1>
          <p style="text-align: center; margin-bottom: 30px;">
            ${format(fromDate, "dd MMMM yyyy", { locale: th })} - ${format(toDate, "dd MMMM yyyy", { locale: th })}
          </p>
          
          <div style="margin-bottom: 30px; padding: 20px; background: #f5f5f5; border-radius: 8px;">
            <div style="display: flex; justify-content: space-around;">
              <div style="text-align: center;">
                <div style="font-size: 14px; color: #666;">ยอดซื้อทั้งหมด</div>
                <div style="font-size: 24px; font-weight: bold; color: #ef4444;">฿${money(buyTotal)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 14px; color: #666;">ยอดขายทั้งหมด</div>
                <div style="font-size: 24px; font-weight: bold; color: #22c55e;">฿${money(sellTotal)}</div>
              </div>
              <div style="text-align: center;">
                <div style="font-size: 14px; color: #666;">กำไรสุทธิ</div>
                <div style="font-size: 24px; font-weight: bold; color: #3b82f6;">฿${money(sellTotal - buyTotal)}</div>
              </div>
            </div>
          </div>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background: #f5f5f5; border-bottom: 2px solid #ddd;">
                <th style="padding: 12px; text-align: left; font-weight: 600;">เลขที่บิล</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">วันที่</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">ประเภท</th>
                <th style="padding: 12px; text-align: left; font-weight: 600;">ลูกค้า</th>
                <th style="padding: 12px; text-align: right; font-weight: 600;">ยอดรวม</th>
                <th style="padding: 12px; text-align: center; font-weight: 600;">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              ${bills.map((bill: any) => `
                <tr style="border-bottom: 1px solid #eee;">
                  <td style="padding: 12px;">${bill.bill_no}</td>
                  <td style="padding: 12px;">${format(new Date(bill.bill_date), "dd/MM/yyyy HH:mm")}</td>
                  <td style="padding: 12px;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; ${
                      bill.type === "buy" 
                        ? "background: #fee2e2; color: #991b1b;" 
                        : "background: #dcfce7; color: #166534;"
                    }">
                      ${bill.type === "buy" ? "ซื้อ" : "ขาย"}
                    </span>
                  </td>
                  <td style="padding: 12px;">${bill.customer}</td>
                  <td style="padding: 12px; text-align: right; font-weight: 600;">฿${money(Number(bill.total))}</td>
                  <td style="padding: 12px; text-align: center;">
                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 12px; ${
                      bill.status === "paid" 
                        ? "background: #dcfce7; color: #166534;" 
                        : "background: #fef3c7; color: #92400e;"
                    }">
                      ${bill.status === "paid" ? "ชำระแล้ว" : "ค้างชำระ"}
                    </span>
                  </td>
                </tr>
              `).join("")}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; text-align: right; color: #666; font-size: 14px;">
            จำนวนบิลทั้งหมด: ${bills.length} รายการ
          </div>
        </div>
      `;
      
      document.body.appendChild(container);
      
      // Generate canvas from the container
      const canvas = await html2canvas(container, {
        scale: 2,
        backgroundColor: "#ffffff",
        logging: false,
      });
      
      // Remove the temporary container
      document.body.removeChild(container);
      
      // Convert to PDF (using canvas as image)
      const imgData = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.download = `bills_${format(fromDate, "yyyyMMdd")}_${format(toDate, "yyyyMMdd")}.png`;
      link.href = imgData;
      link.click();
      
      toast({ title: "สำเร็จ", description: "ส่งออกรายงานเรียบร้อยแล้ว" });
      setIsDialogOpen(false);
    } catch (error: any) {
      toast({ 
        title: "ผิดพลาด", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <FileDown className="h-4 w-4" />
          Export Bills (PDF)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>ส่งออกรายงานบิล</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">จากวันที่</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(fromDate, "PPP", { locale: th })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={fromDate}
                  onSelect={(date) => date && setFromDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">ถึงวันที่</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  {format(toDate, "PPP", { locale: th })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={toDate}
                  onSelect={(date) => date && setToDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="pt-4">
            <p className="text-sm text-muted-foreground mb-4">
              พบบิลทั้งหมด: {bills.length} รายการ
            </p>
            <Button 
              onClick={handleExportPDF} 
              disabled={isExporting || bills.length === 0}
              className="w-full gap-2"
            >
              <FileDown className="h-4 w-4" />
              {isExporting ? "กำลังสร้างไฟล์..." : "ส่งออกรายงาน"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
