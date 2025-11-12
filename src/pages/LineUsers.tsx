import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Link, UserCheck, UserX, RefreshCw } from "lucide-react";
import { useState } from "react";
import { LoadingCard } from "@/components/common/LoadingCard";
import { format } from "date-fns";

export default function LineUsers() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [linkingUserId, setLinkingUserId] = useState<string | null>(null);

  // Fetch LINE users
  const { data: lineUsers, isLoading: isLoadingUsers, refetch } = useQuery({
    queryKey: ["line-users"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("line_users")
        .select(`
          *,
          customers:customer_id (
            id,
            name,
            phone
          )
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Fetch customers for dropdown
  const { data: customers } = useQuery({
    queryKey: ["customers-for-linking"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name, phone")
        .order("name");

      if (error) throw error;
      return data;
    },
  });

  // Link LINE user to customer
  const linkMutation = useMutation({
    mutationFn: async ({ lineUserId, customerId }: { lineUserId: string; customerId: string | null }) => {
      const { error } = await supabase
        .from("line_users")
        .update({
          customer_id: customerId,
          linked_at: customerId ? new Date().toISOString() : null,
        })
        .eq("line_user_id", lineUserId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "เชื่อมโยงสำเร็จ" });
      queryClient.invalidateQueries({ queryKey: ["line-users"] });
      setLinkingUserId(null);
    },
    onError: (error: any) => {
      toast({ title: "เกิดข้อผิดพลาด", description: error.message, variant: "destructive" });
    },
  });

  // Update customer's line_user_id when linked
  const updateCustomerMutation = useMutation({
    mutationFn: async ({ customerId, lineUserId }: { customerId: string; lineUserId: string }) => {
      const { error } = await supabase
        .from("customers")
        .update({ line_user_id: lineUserId })
        .eq("id", customerId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers-for-linking"] });
    },
  });

  const handleLink = async (lineUserId: string, customerId: string | null) => {
    await linkMutation.mutateAsync({ lineUserId, customerId });
    
    // Also update the customer table
    if (customerId) {
      await updateCustomerMutation.mutateAsync({ customerId, lineUserId });
    }
  };

  const stats = {
    total: lineUsers?.length || 0,
    following: lineUsers?.filter(u => u.is_following).length || 0,
    linked: lineUsers?.filter(u => u.customer_id).length || 0,
  };

  return (
    <div className="space-y-6 p-6">
      <Helmet>
        <title>LINE Users - Management System</title>
      </Helmet>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">LINE Users</h1>
        <Button onClick={() => refetch()} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          รีเฟรช
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ผู้ใช้ทั้งหมด</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">กำลังติดตาม</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.following}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">เชื่อมโยงแล้ว</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.linked}</div>
          </CardContent>
        </Card>
      </div>

      {/* LINE Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>รายการผู้ใช้ LINE</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingUsers ? (
            <LoadingCard />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ชื่อแสดง</TableHead>
                    <TableHead>LINE User ID</TableHead>
                    <TableHead>สถานะ</TableHead>
                    <TableHead>ลูกค้าที่เชื่อมโยง</TableHead>
                    <TableHead>เพิ่มเพื่อนเมื่อ</TableHead>
                    <TableHead>การจัดการ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!lineUsers || lineUsers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground">
                        ยังไม่มีผู้ใช้ LINE
                      </TableCell>
                    </TableRow>
                  ) : (
                    lineUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {user.picture_url && (
                              <img
                                src={user.picture_url}
                                alt={user.display_name || "User"}
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span className="font-medium">{user.display_name || "-"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {user.line_user_id.substring(0, 12)}...
                          </code>
                        </TableCell>
                        <TableCell>
                          {user.is_following ? (
                            <Badge variant="default" className="gap-1">
                              <UserCheck className="h-3 w-3" />
                              ติดตาม
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <UserX className="h-3 w-3" />
                              ยกเลิก
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.customers ? (
                            <div>
                              <div className="font-medium">{user.customers.name}</div>
                              {user.customers.phone && (
                                <div className="text-xs text-muted-foreground">{user.customers.phone}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.followed_at ? format(new Date(user.followed_at), "dd/MM/yyyy HH:mm") : "-"}
                        </TableCell>
                        <TableCell>
                          {linkingUserId === user.line_user_id ? (
                            <div className="flex gap-2">
                              <Select
                                onValueChange={(value) => handleLink(user.line_user_id, value === "unlink" ? null : value)}
                              >
                                <SelectTrigger className="w-[200px]">
                                  <SelectValue placeholder="เลือกลูกค้า" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unlink">ยกเลิกการเชื่อมโยง</SelectItem>
                                  {customers?.map((customer) => (
                                    <SelectItem key={customer.id} value={customer.id}>
                                      {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setLinkingUserId(null)}
                              >
                                ยกเลิก
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setLinkingUserId(user.line_user_id)}
                            >
                              <Link className="mr-2 h-4 w-4" />
                              {user.customer_id ? "เปลี่ยน" : "เชื่อมโยง"}
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Webhook URL Info */}
      <Card>
        <CardHeader>
          <CardTitle>Webhook URL</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              ใช้ URL นี้ใน LINE Developers Console → Messaging API → Webhook settings
            </p>
            <code className="block bg-muted p-3 rounded text-sm break-all">
              https://buytjijgcqhadktjwuhn.supabase.co/functions/v1/line-webhook
            </code>
            <p className="text-xs text-muted-foreground mt-2">
              💡 เคล็ดลับ: ลูกค้าสามารถส่งเบอร์โทรศัพท์ของตัวเองมาทาง LINE เพื่อเชื่อมโยงบัญชีอัตโนมัติ
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
