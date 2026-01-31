import { Menu, Plus, FileText, LogOut, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";

interface DashboardHeaderProps {
  onMenuToggle: () => void;
}

export const DashboardHeader = ({ onMenuToggle }: DashboardHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-4 shadow-sm lg:px-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onMenuToggle}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <div className="hidden items-center gap-2 md:flex">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[image:var(--gradient-primary)]">
            <span className="text-sm font-bold text-primary-foreground">AG</span>
          </div>
          <span className="text-lg font-semibold text-foreground">AxelGuard</span>
        </div>
      </div>

      <div className="hidden max-w-md flex-1 px-8 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search orders, customers..."
            className="h-9 w-full bg-secondary pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2 bg-[image:var(--gradient-primary)] hover:opacity-90">
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Add New</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem>New Sale</DropdownMenuItem>
            <DropdownMenuItem>New Lead</DropdownMenuItem>
            <DropdownMenuItem>Balance Payment</DropdownMenuItem>
            <DropdownMenuItem>Make Quotation</DropdownMenuItem>
            <DropdownMenuItem>Add Inventory</DropdownMenuItem>
            <DropdownMenuItem>New Dispatch</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button variant="outline" className="gap-2 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
          <FileText className="h-4 w-4" />
          <span className="hidden sm:inline">Balance Report</span>
        </Button>

        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
            3
          </span>
        </Button>

        <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  );
};
