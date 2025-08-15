import { Helmet } from "react-helmet-async";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function PendingApproval() {
  const navigate = useNavigate();

  const logout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 animate-fade-in">
      <Helmet>
        <title>รอการอนุมัติสมาชิก | Fruit Flow</title>
        <meta name="description" content="บัญชีของคุณกำลังรอผู้ดูแลระบบอนุมัติการใช้งาน" />
        <link rel="canonical" href={window.location.origin + "/pending-approval"} />
      </Helmet>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>บัญชีกำลังรอการอนุมัติ</CardTitle>
          <CardDescription>ผู้ดูแลระบบจะตรวจสอบและอนุมัติให้เร็วที่สุด</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm opacity-80">คุณสามารถออกจากระบบและเข้าสู่ระบบใหม่ภายหลังเพื่อเช็คสถานะได้</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate("/auth")}>กลับไปหน้าเข้าสู่ระบบ</Button>
            <Button variant="gradient" onClick={logout}>ออกจากระบบ</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
