import { LogOut, Shield, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuthData } from "@/hooks/useAuthData";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

export default function UserMenu() {
  const { loading, session, profile, isAdmin } = useAuthData();
  const navigate = useNavigate();

  if (loading) return null;

  if (!session) {
    return (
      <Button size="sm" variant="outline" onClick={() => navigate("/auth")}>เข้าสู่ระบบ</Button>
    );
  }

  const displayName = profile?.display_name || profile?.email || session.user.email || "ผู้ใช้";
  const initial = (displayName?.[0] || "U").toUpperCase();

  const onLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="rounded-full px-2">
          <div className="size-8 rounded-full grid place-items-center bg-gradient-to-br from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] text-white/95 text-sm font-semibold shadow" aria-label="โปรไฟล์ผู้ใช้">
            {initial}
          </div>
          <span className="ml-2 hidden sm:block max-w-[160px] truncate text-sm">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel className="max-w-[220px] truncate">{displayName}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}> 
          <UserIcon className="mr-2 h-4 w-4" /> โปรไฟล์ของฉัน
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem onClick={() => navigate("/admin")}>
            <Shield className="mr-2 h-4 w-4" /> หน้าผู้ดูแลระบบ
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onLogout}>
          <LogOut className="mr-2 h-4 w-4" /> ออกจากระบบ
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
