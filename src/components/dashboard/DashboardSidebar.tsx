import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ShoppingCart,
  Users,
  Package,
  Truck,
  FileText,
  Settings,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: ShoppingCart, label: "Sales" },
  { icon: Users, label: "Leads" },
  { icon: Package, label: "Inventory" },
  { icon: Truck, label: "Dispatch" },
  { icon: FileText, label: "Reports" },
  { icon: Settings, label: "Settings" },
];

export const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-foreground/50 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-64 flex-col border-r border-border bg-card shadow-lg transition-transform duration-300 lg:static lg:z-auto lg:translate-x-0 lg:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
              <span className="text-sm font-bold text-primary-foreground">AG</span>
            </div>
            <span className="text-lg font-semibold text-foreground">AxelGuard</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="hidden h-16 items-center gap-2 border-b border-border px-4 lg:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <span className="text-sm font-bold text-primary-foreground">AG</span>
          </div>
          <span className="text-lg font-semibold text-foreground">AxelGuard</span>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => (
            <button
              key={item.label}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                item.active
                  ? "bg-[image:var(--gradient-primary)] text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="border-t border-border p-4">
          <div className="flex items-center gap-3 rounded-lg bg-secondary p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[image:var(--gradient-primary)]">
              <span className="text-sm font-semibold text-primary-foreground">AS</span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-medium text-foreground">Admin User</p>
              <p className="truncate text-xs text-muted-foreground">admin@axelguard.com</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
