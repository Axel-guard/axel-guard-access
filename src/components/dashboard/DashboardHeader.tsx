import { useState } from "react";
import { 
  Menu, 
  Plus, 
  FileText, 
  LogOut, 
  Search,
  ShoppingCart,
  UserPlus,
  Wallet,
  FileEdit,
  Package,
  Truck,
  User,
  Shield
} from "lucide-react";
import { AxelGuardLogo } from "@/components/ui/axelguard-logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { NewSaleDialog } from "@/components/forms/NewSaleDialog";
import { BalancePaymentDialog } from "@/components/forms/BalancePaymentDialog";
import { NewLeadDialog } from "@/components/forms/NewLeadDialog";
import { NotificationPanel } from "@/components/notifications/NotificationPanel";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface DashboardHeaderProps {
  onMenuToggle: () => void;
}

const menuItems = [
  {
    label: "New Sale",
    icon: ShoppingCart,
    color: "text-success",
    bgColor: "bg-success/10",
    action: "newSale",
  },
  {
    label: "New Lead",
    icon: UserPlus,
    color: "text-info",
    bgColor: "bg-info/10",
    action: "newLead",
  },
  {
    label: "Balance Payment",
    icon: Wallet,
    color: "text-warning",
    bgColor: "bg-warning/10",
    action: "balancePayment",
  },
  {
    label: "Make Quotation",
    icon: FileEdit,
    color: "text-primary",
    bgColor: "bg-primary/10",
    action: "quotation",
  },
  {
    label: "Add Inventory",
    icon: Package,
    color: "text-accent-foreground",
    bgColor: "bg-accent/50",
    action: "inventory",
  },
  {
    label: "New Dispatch",
    icon: Truck,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    action: "dispatch",
  },
];

export const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  const navigate = useNavigate();
  const { user, signOut, isAdmin, role } = useAuth();
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [balancePaymentOpen, setBalancePaymentOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleMenuClick = (action: string) => {
    setDropdownOpen(false);
    switch (action) {
      case "newSale":
        setNewSaleOpen(true);
        break;
      case "newLead":
        setNewLeadOpen(true);
        break;
      case "balancePayment":
        setBalancePaymentOpen(true);
        break;
      case "quotation":
        // Navigate to quotation or open dialog
        break;
      case "inventory":
        navigate("/inventory");
        break;
      case "dispatch":
        navigate("/dispatch");
        break;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    toast.success("Logged out successfully");
    navigate("/auth");
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 items-center justify-between border-b border-border bg-card/95 px-2 sm:px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 sm:h-10 sm:w-10 hover:bg-muted lg:hidden"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-2 lg:hidden">
            <AxelGuardLogo size="sm" showText={false} />
          </div>
        </div>

        {/* Search - Hidden on mobile, shown on tablet+ */}
        <div className="hidden max-w-md flex-1 px-4 md:block lg:px-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              className="h-9 sm:h-10 w-full rounded-xl border-border bg-muted/50 pl-10 text-sm focus:bg-muted focus:border-primary/50"
            />
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
            <DropdownMenuContent 
              align="end" 
              className="w-48 sm:w-56 p-1.5 sm:p-2 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl animate-scale-in"
              sideOffset={8}
            >
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

          {/* Balance Report - Icon only on mobile */}
          <Button 
            variant="outline" 
            size="icon"
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
                  {isAdmin && (
                    <Shield className="absolute -bottom-1 -right-1 h-3 w-3 text-primary" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 sm:w-56 rounded-xl">
              <div className="px-3 py-2">
                <p className="text-sm font-medium truncate">{user?.email}</p>
                <Badge variant={isAdmin ? "default" : "secondary"} className="mt-1 text-xs">
                  {isAdmin ? (
                    <><Shield className="h-3 w-3 mr-1" /> Admin</>
                  ) : (
                    <><User className="h-3 w-3 mr-1" /> User</>
                  )}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => navigate("/user-management")} className="cursor-pointer">
                  <Shield className="h-4 w-4 mr-2" />
                  User Management
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                <User className="h-4 w-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleSignOut} 
                className="cursor-pointer text-destructive focus:text-destructive"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Dialogs */}
      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
      <BalancePaymentDialog open={balancePaymentOpen} onOpenChange={setBalancePaymentOpen} />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </>
  );
};