import { useState } from "react";
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
  ChevronDown,
  ChevronRight,
  Search,
  Calculator,
  CreditCard,
  FileCheck,
  RefreshCw,
  Database,
  Tag,
  ClipboardCheck,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface DashboardSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  icon: React.ElementType;
  label: string;
  path?: string;
  children?: { icon: React.ElementType; label: string; path: string }[];
}

const navItems: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: BarChart3,
    label: "Reports & Analytics",
    children: [
      { icon: FileText, label: "Sales Reports", path: "/reports" },
    ],
  },
  {
    icon: Search,
    label: "Search",
    children: [
      { icon: Users, label: "Customer Details", path: "/leads" },
      { icon: Search, label: "Order Details by Order ID", path: "/sales" },
      { icon: Calculator, label: "Courier Charges Calculator", path: "/dispatch" },
    ],
  },
  {
    icon: ShoppingCart,
    label: "Sale",
    children: [
      { icon: ShoppingCart, label: "Current Month Sale", path: "/current-month-sales" },
      { icon: CreditCard, label: "Balance Payment", path: "/balance-payments" },
      { icon: Database, label: "Sale Database", path: "/sales" },
      { icon: FileCheck, label: "Quotations", path: "/sales?tab=quotations" },
      { icon: RefreshCw, label: "Renewal", path: "/sales?tab=renewal" },
    ],
  },
  {
    icon: Package,
    label: "Inventory",
    children: [
      { icon: Package, label: "Inventory Stock", path: "/inventory" },
      { icon: Truck, label: "Dispatch", path: "/dispatch" },
      { icon: ClipboardCheck, label: "Quality Check", path: "/quality-check" },
      { icon: FileText, label: "Reports", path: "/reports?tab=inventory" },
    ],
  },
  { icon: Tag, label: "Pricing", path: "/pricing" },
  {
    icon: Database,
    label: "Database",
    children: [
      { icon: Users, label: "Leads Database", path: "/leads" },
      { icon: Package, label: "Products Database", path: "/settings?tab=products" },
    ],
  },
  { icon: Settings, label: "Settings", path: "/settings" },
];

export const DashboardSidebar = ({ isOpen, onClose }: DashboardSidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [openGroups, setOpenGroups] = useState<string[]>(["Sale", "Inventory"]);

  const handleNavClick = (path: string) => {
    navigate(path);
    onClose();
  };

  const toggleGroup = (label: string) => {
    setOpenGroups((prev) =>
      prev.includes(label) ? prev.filter((g) => g !== label) : [...prev, label]
    );
  };

  const isActive = (path: string) => {
    const [pathname, search] = path.split("?");
    if (search) {
      return location.pathname === pathname && location.search.includes(search);
    }
    return location.pathname === pathname;
  };

  const isGroupActive = (item: NavItem) => {
    if (item.path) return isActive(item.path);
    return item.children?.some((child) => isActive(child.path));
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
          "fixed left-0 top-0 z-50 flex h-full w-64 shrink-0 flex-col border-r border-border bg-card transition-transform duration-300 lg:relative lg:z-auto lg:translate-x-0",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Mobile header with close button */}
        <div className="flex h-16 items-center justify-between border-b border-border px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AxelGuard</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="hover:bg-muted">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Desktop header */}
        <div className="hidden h-16 items-center gap-3 border-b border-border px-4 lg:flex">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold text-foreground">AxelGuard</span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="space-y-1">
            {navItems.map((item) => {
              if (item.children) {
                const groupIsOpen = openGroups.includes(item.label);
                const groupActive = isGroupActive(item);

                return (
                  <Collapsible
                    key={item.label}
                    open={groupIsOpen}
                    onOpenChange={() => toggleGroup(item.label)}
                  >
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                          groupActive
                            ? "bg-primary/10 text-primary"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </div>
                        {groupIsOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pl-4 pt-1">
                      <div className="space-y-1 border-l border-border pl-4">
                        {item.children.map((child) => {
                          const childActive = isActive(child.path);
                          return (
                            <button
                              key={child.label}
                              onClick={() => handleNavClick(child.path)}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                childActive
                                  ? "bg-primary text-primary-foreground font-medium"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                            >
                              <child.icon className="h-4 w-4" />
                              <span>{child.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              }

              const itemActive = isActive(item.path!);
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavClick(item.path!)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                    itemActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* User section */}
        <div className="border-t border-border p-3">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-sm font-bold text-primary-foreground">AS</span>
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
