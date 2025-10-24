import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Search } from "lucide-react";
import { format } from "date-fns";
import { th } from "date-fns/locale";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface AuditLog {
  id: string;
  user_id: string | null;
  table_name: string;
  action: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  created_at: string;
  profiles: { display_name?: string; email?: string } | null;
}

export default function AuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["audit-logs", tableFilter, actionFilter],
    queryFn: async () => {
      let query = supabase
        .from("audit_logs" as any)
        .select("*, profiles:user_id(display_name, email)")
        .order("created_at", { ascending: false })
        .limit(100);

      if (tableFilter !== "all") query = query.eq("table_name", tableFilter);
      if (actionFilter !== "all") query = query.eq("action", actionFilter);

      const { data, error } = await query;
      if (error) throw error;
      return data as AuditLog[];
    },
  });

  const filteredLogs = logs?.filter((log) => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      log.table_name.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.profiles?.display_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <>
      <Helmet>
        <title>ประวัติการแก้ไข - Fruit Flow</title>
      </Helmet>

      <div className="space-y-6">
        <h1 className="text-3xl font-bold">ประวัติการแก้ไข</h1>

        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>ระบบบันทึกอัตโนมัติ</AlertTitle>
          <AlertDescription>บันทึกการเปลี่ยนแปลงข้อมูลสำคัญทั้งหมด</AlertDescription>
        </Alert>

        <Card className="p-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="ค้นหา..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10" />
              </div>
              <Select value={tableFilter} onValueChange={setTableFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="bills">บิล</SelectItem>
                  <SelectItem value="customers">ลูกค้า</SelectItem>
                  <SelectItem value="employees">พนักงาน</SelectItem>
                  <SelectItem value="expenses">ค่าใช้จ่าย</SelectItem>
                </SelectContent>
              </Select>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทั้งหมด</SelectItem>
                  <SelectItem value="INSERT">เพิ่ม</SelectItem>
                  <SelectItem value="UPDATE">แก้ไข</SelectItem>
                  <SelectItem value="DELETE">ลบ</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วันที่/เวลา</TableHead>
                  <TableHead>ตาราง</TableHead>
                  <TableHead>การกระทำ</TableHead>
                  <TableHead>ผู้ใช้งาน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={4} className="text-center">กำลังโหลด...</TableCell></TableRow>
                ) : filteredLogs?.length ? (
                  filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>{format(new Date(log.created_at), "dd MMM yyyy HH:mm", { locale: th })}</TableCell>
                      <TableCell>{log.table_name}</TableCell>
                      <TableCell><Badge>{log.action}</Badge></TableCell>
                      <TableCell>{log.profiles?.display_name || "ระบบ"}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow><TableCell colSpan={4} className="text-center">ไม่มีข้อมูล</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </>
  );
}
