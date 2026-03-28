import { useState, useRef, useEffect } from "react";
import {
  Menu, Plus, FileText, LogOut, Search,
  ShoppingCart, UserPlus, Wallet, FileEdit,
  Package, Truck, User, Shield, ListTodo,
  Building2, Phone,
} from "lucide-react";
import { AxelGuardLogo } from "@/components/ui/axelguard-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NewSaleDialog } from "@/components/forms/NewSaleDialog";
import { BalancePaymentDialog } from "@/components/forms/BalancePaymentDialog";
import { NewLeadDialog } from "@/components/forms/NewLeadDialog";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerSuggestions, CustomerSuggestion } from "@/hooks/useCustomerDetails";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  onMenuToggle: () => void;
}

const menuItems = [
  { label: "New Sale",        icon: ShoppingCart, color: "text-success",          bgColor: "bg-success/10",          action: "newSale" },
  { label: "New Lead",        icon: UserPlus,     color: "text-info",             bgColor: "bg-info/10",             action: "newLead" },
  { label: "Balance Payment", icon: Wallet,       color: "text-warning",          bgColor: "bg-warning/10",          action: "balancePayment" },
  { label: "Make Quotation",  icon: FileEdit,     color: "text-primary",          bgColor: "bg-primary/10",          action: "quotation" },
  { label: "Add Inventory",   icon: Package,      color: "text-accent-foreground",bgColor: "bg-accent/50",           action: "inventory" },
  { label: "New Dispatch",    icon: Truck,        color: "text-destructive",      bgColor: "bg-destructive/10",      action: "dispatch" },
  { label: "New Task",        icon: ListTodo,     color: "text-primary",          bgColor: "bg-primary/10",          action: "newTask" },
];

export const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin } = useAuth();

  // Dialog states
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [balancePaymentOpen, setBalancePaymentOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [newTaskOpen, setNewTaskOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  // Search bar states
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data: suggestions = [] } = useCustomerSuggestions(searchQuery);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setShowSuggestions(e.target.value.trim().length >= 2);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") setShowSuggestions(false);
    if (e.key === "Enter" && searchQuery.trim()) {
      setShowSuggestions(false);
      navigate("/customer-details", { state: { preloadCode: searchQuery.trim() } });
      setSearchQuery("");
    }
  };

  const handleSelectSuggestion = (s: CustomerSuggestion) => {
    setShowSuggestions(false);
    setSearchQuery("");
    navigate("/customer-details", { state: { preloadCode: s.customer_code } });
  };

  const handleMenuClick = (action: string) => {
    setDropdownOpen(false);
    switch (action) {
      case "newSale":        setNewSaleOpen(true); break;
      case "newLead":        setNewLeadOpen(true); break;
      case "balancePayment": setBalancePaymentOpen(true); break;
      case "quotation":      navigate("/quotations"); break;
      case "inventory":      navigate("/inventory"); break;
      case "dispatch":       navigate("/dispatch"); break;
      case "newTask":        setNewTaskOpen(true); break;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  const visibleSuggestions = showSuggestions && suggestions.length > 0 ? suggestions : [];

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-border bg-card/95 px-2 sm:px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost" size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-muted lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 lg:hidden">
            <AxelGuardLogo size="sm" showText={false} />
          </div>
        </div>

        {/* ── Search with autocomplete ── */}
        <div className="hidden max-w-md flex-1 px-4 md:block lg:px-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10 pointer-events-none" />
            <Input
              ref={inputRef}
              placeholder="Search customers by name, company, mobile…"
              value={searchQuery}
              onChange={handleSearchChange}
              onKeyDown={handleSearchKeyDown}
              onFocus={() => { if (searchQuery.trim().length >= 2 && suggestions.length > 0) setShowSuggestions(true); }}
              className="h-9 sm:h-10 w-full rounded-xl border-border bg-muted/50 pl-10 text-sm focus:bg-muted focus:border-primary/50"
              autoComplete="off"
            />

            {/* Suggestion dropdown */}
            {visibleSuggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute left-0 right-0 z-50 mt-1 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
              >
                <div className="py-1">
                  {visibleSuggestions.map((s) => (
                    <button
                      key={s.customer_code}
                      onMouseDown={(e) => { e.preventDefault(); handleSelectSuggestion(s); }}
                      className="w-full text-left px-4 py-2.5 hover:bg-muted/60 transition-colors border-b border-border/30 last:border-0 flex items-start gap-3"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-0.5">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm text-foreground truncate">{s.customer_name}</span>
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono shrink-0">{s.customer_code}</Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                          {s.company_name && (
                            <span className="flex items-center gap-1">
                              <Building2 className="h-3 w-3" />{s.company_name}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />{s.mobile_number}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <div className="px-4 py-2 bg-muted/30 border-t border-border/30 text-center">
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setShowSuggestions(false);
                      navigate("/customer-details", { state: { preloadCode: searchQuery.trim() } });
                      setSearchQuery("");
                    }}
                    className="text-xs text-primary hover:underline"
                  >
                    View all results for "{searchQuery}"
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
          {/* Add New Dropdown */}
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="h-9 sm:h-10 gap-1 sm:gap-2 px-2 sm:px-4 rounded-xl bg-primary shadow-lg hover:bg-primary/90 transition-all hover-scale text-xs sm:text-sm">
                <Plus className="h-4 w-4" />
                <span className="hidden xs:inline sm:inline">Add New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56 p-1.5 sm:p-2 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl animate-scale-in" sideOffset={8}>
              {menuItems.map((item) => (
                <DropdownMenuItem
                  key={item.action}
                  onClick={() => handleMenuClick(item.action)}
                  className="flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2 sm:py-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted focus:bg-muted group"
                >
                  <div className={`flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg ${item.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                    <item.icon className={`h-4 w-4 sm:h-5 sm:w-5 ${item.color}`} />
                  </div>
                  <span className="font-medium text-foreground text-sm">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Balance Report */}
          <Button
            variant="outline" size="icon"
            className="h-9 w-9 sm:h-10 sm:w-auto sm:px-4 rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
            onClick={() => navigate("/balance-payments")}
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline sm:ml-2 text-sm">Balance Report</span>
          </Button>

          <NotificationPanel />

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl hover:bg-muted">
                <div className="relative">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {isAdmin && <Shield className="absolute -bottom-1 -right-1 h-3 w-3 text-primary" />}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56 rounded-xl">
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1 text-xs">
                  {isAdmin ? <><Shield className="h-3 w-3 mr-1" />Admin</> : <><User className="h-3 w-3 mr-1" />User</>}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/user-management")} className="cursor-pointer">
                  <Shield className="h-4 w-4 mr-2" />User Management
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer text-destructive focus:text-destructive">
                <LogOut className="h-4 w-4 mr-2" />Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Dialogs */}
      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
      <BalancePaymentDialog open={balancePaymentOpen} onOpenChange={setBalancePaymentOpen} />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
      <AddTaskDialog open={newTaskOpen} onOpenChange={setNewTaskOpen} />
    </>
  );
};
