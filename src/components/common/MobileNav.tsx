import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BarChart3, FilePlus2, ClipboardList, Users, ReceiptText, CreditCard, UserCheck } from "lucide-react";

const tabs = [
  { to: "/dashboard", label: "หน้าหลัก", Icon: BarChart3 },
  { to: "/bills", label: "บิล", Icon: ReceiptText },
  { to: "/create", label: "สร้าง", Icon: FilePlus2 },
  { to: "/customers", label: "ลูกค้า", Icon: Users },
];

export default function MobileNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden glass border-t animate-slide-up safe-area-pb">
      <div className="grid grid-cols-4 h-16">
        {tabs.map(({ to, label, Icon }) => (
          <NavLink
            key={to}
            to={to}
            end
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center justify-center gap-1 text-xs transition-colors",
                isActive
                  ? "text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon className={cn("h-5 w-5", isActive && "animate-scale-in")} />
                <span>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
