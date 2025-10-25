import { useState } from "react";
import { Menu, X } from "lucide-react";
import { NavLink } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BarChart3, FilePlus2, ClipboardList, Users, ReceiptText, CreditCard, UserCheck } from "lucide-react";

const allTabs = [
  { to: "/dashboard", label: "Dashboard", Icon: BarChart3 },
  { to: "/bills", label: "รายการบิล", Icon: ReceiptText },
  { to: "/create", label: "สร้างบิล", Icon: FilePlus2 },
  { to: "/baskets", label: "ตะกร้า", Icon: ClipboardList },
  { to: "/customers", label: "ลูกค้า", Icon: Users },
  { to: "/expenses", label: "ค่าใช้จ่าย", Icon: CreditCard },
  { to: "/employees", label: "พนักงาน", Icon: UserCheck },
];

export default function MobileMenuButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="เมนู"
      >
        {isOpen ? <X /> : <Menu />}
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden animate-fade-in"
            onClick={() => setIsOpen(false)}
          />
          <div className="fixed top-[4.5rem] right-4 w-64 bg-card border rounded-lg shadow-lg z-50 md:hidden animate-scale-in overflow-hidden">
            <div className="p-2 space-y-1">
              {allTabs.map(({ to, label, Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-3 px-4 py-3 rounded-md transition-colors",
                      isActive
                        ? "bg-primary text-primary-foreground font-medium"
                        : "hover:bg-muted"
                    )
                  }
                >
                  <Icon className="h-5 w-5" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}
