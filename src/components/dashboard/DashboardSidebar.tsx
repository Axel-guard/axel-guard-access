import { cn } from "@/lib/utils";
import { useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Truck,
  FileText,
  Settings,
  X,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: ShoppingCart, label: "Sales", path: "/sales" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: Package, label: "Inventory", path: "/inventory" },
  { icon: Truck, label: "Dispatch", path: "/dispatch" },
  { icon: FileText, label: "Reports", path: "/reports" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-white/10 bg-card/80 backdrop-blur-2xl transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-white/10 px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">AxelGuard</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-white/10">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="hidden h-16 items-center gap-3 border-b border-white/10 px-4 lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-lg">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground">AxelGuard</span>
        </div>

        <nav className="flex-1 space-y-1.5 p-4">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.label}
                onClick={() => handleNavClick(item.path)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-[image:var(--gradient-primary)] text-white shadow-lg shadow-primary/25"
                    : "text-muted-foreground hover:bg-white/10 hover:text-foreground"
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3 backdrop-blur-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-md">
              <span className="text-sm font-bold text-white">AS</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-foreground">Admin User</p>
              <p className="truncate text-xs text-muted-foreground">admin@axelguard.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};