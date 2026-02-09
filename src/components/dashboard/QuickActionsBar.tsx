import { useState } from "react";
import { ShoppingCart, UserPlus, FileEdit, Truck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NewSaleDialog } from "@/components/forms/NewSaleDialog";
import { NewLeadDialog } from "@/components/forms/NewLeadDialog";
import { useNavigate } from "react-router-dom";

const quickActions = [
  {
    label: "New Sale",
    icon: ShoppingCart,
    action: "newSale",
    variant: "primary" as const,
  },
  {
    label: "Add Lead",
    icon: UserPlus,
    action: "newLead",
    variant: "info" as const,
  },
  {
    label: "Create Quotation",
    icon: FileEdit,
    action: "quotation",
    variant: "warning" as const,
  },
  {
    label: "Dispatch",
    icon: Truck,
    action: "dispatch",
    variant: "success" as const,
  },
];

const variantStyles = {
  primary: "bg-primary hover:bg-primary/90 text-primary-foreground",
  info: "bg-info hover:bg-info/90 text-info-foreground",
  warning: "bg-warning hover:bg-warning/90 text-warning-foreground",
  success: "bg-success hover:bg-success/90 text-success-foreground",
};

export const QuickActionsBar = () => {
  const navigate = useNavigate();
  const [newSaleOpen, setNewSaleOpen] = useState(false);
  const [newLeadOpen, setNewLeadOpen] = useState(false);

  const handleAction = (action: string) => {
    switch (action) {
      case "newSale":
        setNewSaleOpen(true);
        break;
      case "newLead":
        setNewLeadOpen(true);
        break;
      case "quotation":
        navigate("/quotations");
        break;
      case "dispatch":
        navigate("/dispatch");
        break;
    }
  };

  return (
    <>
      {/* Desktop: horizontal row, Mobile: scrollable horizontal */}
      <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-2 -mx-3 px-3 sm:mx-0 sm:px-0 sm:overflow-visible sm:flex-wrap scrollbar-hide">
        {quickActions.map((action) => (
          <Button
            key={action.action}
            onClick={() => handleAction(action.action)}
            className={`gap-1.5 sm:gap-2 rounded-xl px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-medium shadow-sm transition-all hover:scale-[1.02] hover:shadow-md whitespace-nowrap min-h-[40px] sm:min-h-[44px] ${variantStyles[action.variant]}`}
          >
            <action.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline sm:inline">{action.label}</span>
            <span className="xs:hidden">{action.label.split(' ')[0]}</span>
          </Button>
        ))}
      </div>

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </>
  );
};
