import { useState } from "react";
import { Menu, Plus, FileText, LogOut, Bell, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { NewSaleDialog } from "@/components/forms/NewSaleDialog";
import { BalancePaymentDialog } from "@/components/forms/BalancePaymentDialog";
import { NewLeadDialog } from "@/components/forms/NewLeadDialog";

interface DashboardHeaderProps {
  onMenuToggle: () => void;
}

export const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [balancePaymentOpen, setBalancePaymentOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-white/10 bg-card/60 px-4 backdrop-blur-2xl lg:px-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden hover:bg-white/10"
            onClick={onMenuToggle}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="hidden items-center gap-3 md:flex">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[image:var(--gradient-primary)] shadow-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground">AxelGuard</span>
          </div>
        </div>

        <div className="hidden max-w-md flex-1 px-8 md:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search orders, customers..."
              className="h-10 w-full rounded-xl border-white/20 bg-white/10 pl-10 backdrop-blur-sm focus:bg-white/20 focus:border-primary/50"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 rounded-xl bg-[image:var(--gradient-primary)] shadow-lg shadow-primary/25 hover:opacity-90 transition-all">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add New</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-xl border-white/20 bg-card/95 backdrop-blur-xl">
              <DropdownMenuItem onClick={() => setNewSaleOpen(true)} className="rounded-lg">
                New Sale
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setNewLeadOpen(true)} className="rounded-lg">
                New Lead
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setBalancePaymentOpen(true)} className="rounded-lg">
                Balance Payment
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button 
            variant="outline" 
            className="gap-2 rounded-xl border-primary/30 bg-white/5 text-primary hover:bg-primary hover:text-primary-foreground backdrop-blur-sm"
          >
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Balance Report</span>
          </Button>

          <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-white/10">
            <Bell className="h-5 w-5 text-muted-foreground" />
            <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-[image:var(--gradient-primary)] text-[10px] font-bold text-white shadow-sm">
              3
            </span>
          </Button>

          <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10">
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Dialogs */}
      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
      <BalancePaymentDialog open={balancePaymentOpen} onOpenChange={setBalancePaymentOpen} />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </>
  );
};