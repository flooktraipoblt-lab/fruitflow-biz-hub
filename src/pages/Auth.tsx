import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AuthPage() {
  const [tab, setTab] = useState<"login"|"signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const onLogin = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast({ title: "เข้าสู่ระบบไม่สำเร็จ", description: error.message });
    } else {
      navigate("/dashboard", { replace: true });
    }
  };

  const onSignup = async () => {
    setLoading(true);
    const redirectUrl = `${window.location.origin}/`;
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: redirectUrl },
    });
    setLoading(false);
    if (error) {
      toast({ title: "สมัครสมาชิกไม่สำเร็จ", description: error.message });
    } else {
      toast({ title: "สมัครสมาชิกสำเร็จ", description: "กรุณายืนยันอีเมล (ถ้าจำเป็น) แล้วเข้าสู่ระบบ" });
      setTab("login");
    }
  };

  return (
    <div className="min-h-screen grid place-items-center px-4 animate-fade-in">
      <Helmet>
        <title>เข้าสู่ระบบ | Fruit Flow</title>
        <meta name="description" content="เข้าสู่ระบบ/สมัครสมาชิกเพื่อใช้งาน Fruit Flow" />
        <link rel="canonical" href={window.location.origin + "/auth"} />
      </Helmet>

      <Card className="w-full max-w-md hover:shadow-lg" style={{ boxShadow: "var(--shadow-elevated)" }}>
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">ยินดีต้อนรับ</CardTitle>
          <CardDescription>เข้าสู่ระบบเพื่อจัดการบิลและข้อมูล</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={tab} className="w-full" onValueChange={(v)=>setTab(v as any)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">เข้าสู่ระบบ</TabsTrigger>
              <TabsTrigger value="signup">สมัครสมาชิก</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="mt-4 space-y-3">
            <div>
              <label className="block text-sm mb-1">อีเมล</label>
              <Input type="email" placeholder="you@example.com" value={email} onChange={(e)=>setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm mb-1">รหัสผ่าน</label>
              <Input type="password" placeholder="••••••••" value={password} onChange={(e)=>setPassword(e.target.value)} />
            </div>
            {tab === "login" ? (
              <Button className="w-full" onClick={onLogin} disabled={loading} variant="gradient">
                {loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
              </Button>
            ) : (
              <Button className="w-full" onClick={onSignup} disabled={loading} variant="gradient">
                {loading ? "กำลังสมัครสมาชิก..." : "สมัครสมาชิก"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
