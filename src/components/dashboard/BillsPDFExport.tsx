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
import { useNavigate } from "react-router-dom";

export function BillsPDFExport() {
  const [fromDate, setFromDate] = useState<Date>(new Date());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const navigate = useNavigate();

  const { data: bills = [] } = useQuery({
    queryKey: ["bills-pdf-export", fromDate, toDate],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bills")
        .select("id, bill_no, bill_date, type, customer, total, status")
        .gte("bill_date", fromDate.toISOString())
        .lte("bill_date", toDate.toISOString())
        .order("bill_date", { ascending: true });
      
      if (error) throw error;
      return data || [];
    },
    enabled: isDialogOpen,
  });

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      
      if (bills.length === 0) {
        toast({ 
          title: "ไม่พบข้อมูล", 
          description: "ไม่มีบิลในช่วงเวลาที่เลือก",
          variant: "destructive" 
        });
        return;
      }

      // For now, navigate to print page for each bill
      // Open multiple windows in sequence
      for (const bill of bills) {
        window.open(`/print/${bill.id}`, '_blank');
        await new Promise(resolve => setTimeout(resolve, 500)); // Small delay between windows
      }
      
      toast({ 
        title: "สำเร็จ", 
        description: `เปิดหน้าพิมพ์บิลทั้งหมด ${bills.length} ใบ` 
      });
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
          <DialogTitle>ส่งออกบิลเป็น PDF</DialogTitle>
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
              {isExporting ? "กำลังเปิดหน้าพิมพ์..." : "พิมพ์บิลทั้งหมด"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
