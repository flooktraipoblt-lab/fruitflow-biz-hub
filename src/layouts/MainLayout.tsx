import { NavLink, Outlet, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Helmet } from "react-helmet-async";
import { BarChart3, FilePlus2, ClipboardList, Users, ReceiptText, CreditCard, UserCheck } from "lucide-react";
import UserMenu from "@/components/auth/UserMenu";
import MailboxAlertListener from "@/components/common/MailboxAlertListener";

const tabs = [
  { to: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { to: "/bills", label: "รายการบิล", Icon: ReceiptText },
  { to: "/create", label: "สร้างบิล", Icon: FilePlus2 },
  { to: "/baskets", label: "ตะกร้า", Icon: ClipboardList },
  { to: "/customers", label: "ลูกค้า", Icon: Users },
  { to: "/expenses", label: "ค่าใช้จ่าย", Icon: CreditCard },
  { to: "/employees", label: "พนักงาน", Icon: UserCheck },
];

export default function MainLayout() {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Fruit Flow — ระบบจัดการบิลซื้อขาย</title>
        <meta name="description" content="Fruit Flow: ระบบจัดการบิลซื้อขายและหลังบ้าน ครบจบในที่เดียว" />
        <link rel="canonical" href={window.location.origin + pathname} />
      </Helmet>
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <NavLink to="/dashboard" className="font-extrabold text-xl tracking-tight">
            <span className="bg-gradient-to-r from-[hsl(var(--brand-1))] via-[hsl(var(--brand-2))] to-[hsl(var(--brand-3))] bg-clip-text text-transparent">
              Fruit Flow
            </span>
          </NavLink>
          <div className="flex items-center gap-2">
            <nav className="flex items-center gap-1 overflow-x-auto">
              {tabs.map(({ to, label, Icon }) => (
                <NavLink key={to} to={to} end className={({ isActive }) =>
                  cn("focus-visible:outline-none", isActive && "")
                }>
                  {({ isActive }) => (
                    <Button
                      variant={isActive ? "gradient" : "ghost"}
                      size="sm"
                      className={cn(
                        "rounded-full px-4",
                        isActive ? "shadow-md" : "hover:bg-muted"
                      )}
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="opacity-90" />
                      <span className="hidden sm:inline">{label}</span>
                    </Button>
                  )}
                </NavLink>
              ))}
            </nav>
            <UserMenu />
          </div>
        </div>
      </header>
      <MailboxAlertListener />
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}
