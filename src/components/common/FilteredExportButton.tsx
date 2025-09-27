import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Download, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FilteredExportButtonProps {
  data: any[];
  filename: string;
  type: 'bills' | 'expenses';
  onExport: (filters: any) => void;
}

export function FilteredExportButton({ data, filename, type, onExport }: FilteredExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [expenseFilter, setExpenseFilter] = useState<string>("all");
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});

  const handleExport = () => {
    const filters = {
      type: typeFilter,
      expenseFilter,
      dateRange,
    };
    
    let filteredData = data;

    // Apply type filter for bills
    if (type === 'bills' && typeFilter !== "all") {
      filteredData = filteredData.filter(item => item.type === typeFilter);
    }

    // Apply expense filter for expenses
    if (type === 'expenses' && expenseFilter !== "all") {
      if (expenseFilter === "expenses") {
        filteredData = filteredData.filter(item => item.source === 'expense');
      } else if (expenseFilter === "withdrawals") {
        filteredData = filteredData.filter(item => item.source === 'withdrawal');
      }
    }

    // Apply date range filter
    if (dateRange.from) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.bill_date || item.date);
        return itemDate >= dateRange.from!;
      });
    }

    if (dateRange.to) {
      filteredData = filteredData.filter(item => {
        const itemDate = new Date(item.bill_date || item.date);
        return itemDate <= dateRange.to!;
      });
    }

    // Format data for export
    let exportData;
    if (type === 'bills') {
      exportData = filteredData.map(item => ({
        'วันที่': format(new Date(item.bill_date), 'dd/MM/yyyy'),
        'ประเภท': item.type === 'buy' ? 'บิลซื้อ' : 'บิลขาย',
        'ชื่อลูกค้า': item.customer,
        'จำนวนเงิน': item.total
      }));
    } else {
      exportData = filteredData.map(item => ({
        'วันที่': format(new Date(item.date), 'dd/MM/yyyy'),
        'ประเภท': item.type,
        'จำนวนเงิน': item.amount
      }));
    }

    // Generate CSV
    if (exportData.length === 0) return;
    const keys = Object.keys(exportData[0]);
    const csv = [
      keys.join(","),
      ...exportData.map(row => keys.map(k => JSON.stringify(row[k] ?? "")).join(","))
    ].join("\n");
    
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);

    setIsOpen(false);
  };

  const resetFilters = () => {
    setTypeFilter("all");
    setExpenseFilter("all");
    setDateRange({});
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export
        </Button>
      </DialogTrigger>
      <DialogContent className="shadow-elegant bg-card">
        <DialogHeader>
          <DialogTitle className="text-xl text-primary">Export ข้อมูล</DialogTitle>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">ตัวกรองสำหรับ Export</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {type === 'bills' && (
              <div className="space-y-2">
                <Label>ประเภทบิล</Label>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ทุกประเภท</SelectItem>
                    <SelectItem value="buy">บิลซื้อ</SelectItem>
                    <SelectItem value="sell">บิลขาย</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {type === 'expenses' && (
              <div className="space-y-2">
                <Label>ประเภทข้อมูล</Label>
                <Select value={expenseFilter} onValueChange={setExpenseFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="เลือกประเภท" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">ค่าใช้จ่าย + รายการเบิก</SelectItem>
                    <SelectItem value="expenses">รายการค่าใช้จ่าย</SelectItem>
                    <SelectItem value="withdrawals">รายการเบิก</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="space-y-2">
              <Label>ช่วงวันที่</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      <span>
                        {format(dateRange.from, "dd/MM/yyyy")} - {dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : "ปัจจุบัน"}
                      </span>
                    ) : (
                      <span>เลือกช่วงวันที่</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange as any}
                    onSelect={(range: any) => setDateRange(range ?? {})}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex justify-between gap-2 pt-4">
              <Button variant="outline" onClick={resetFilters}>
                รีเซ็ตตัวกรอง
              </Button>
              <Button onClick={handleExport} className="gap-2">
                <Download className="h-4 w-4" />
                Export Excel
              </Button>
            </div>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}