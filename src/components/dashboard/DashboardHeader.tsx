import { useState } from "react";
import { 
  Menu, 
  Plus, 
  FileText, 
  LogOut, 
  Bell, 
  Search, 
  Sparkles,
  ShoppingCart,
  UserPlus,
  Wallet,
  FileEdit,
  Package,
  Truck,
  User,
  Shield
} from "lucide-react";
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
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card/95 px-4 backdrop-blur-xl lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="hover:bg-muted"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden items-center gap-3 md:flex lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">AxelGuard</span>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 px-8 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              className="h-10 w-full rounded-xl border-border bg-muted/50 pl-10 focus:bg-muted focus:border-primary/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu open={dropdownOpen} onOpenChange={setDropdownOpen}>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 rounded-xl bg-primary shadow-lg hover:bg-primary/90 transition-all hover-scale">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
              align="end" 
              className="w-56 p-2 rounded-2xl border border-border/50 bg-card/95 backdrop-blur-xl shadow-xl animate-scale-in"
              sideOffset={8}
            >
              {menuItems.map((item) => (
                <DropdownMenuItem 
                  key={item.action}
                  onClick={() => handleMenuClick(item.action)} 
                  className="flex items-center gap-3 px-3 py-3 rounded-xl cursor-pointer transition-all duration-200 hover:bg-muted focus:bg-muted group"
                >
                  <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${item.bgColor} transition-transform duration-200 group-hover:scale-110`}>
                    <item.icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <span className="font-medium text-foreground">{item.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            className="gap-2 rounded-xl border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Balance Report</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-muted">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-sm">
              3
            </span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl hover:bg-muted">
                <div className="relative">
                  <User className="h-5 w-5 text-muted-foreground" />
                  {isAdmin && (
                    <Shield className="absolute -bottom-1 -right-1 h-3 w-3 text-primary" />
                  )}
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
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