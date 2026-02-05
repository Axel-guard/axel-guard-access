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
      <div className="flex flex-wrap items-center gap-3">
        {quickActions.map((action) => (
          <Button
            key={action.action}
            onClick={() => handleAction(action.action)}
            className={`gap-2 rounded-xl px-4 py-2.5 font-medium shadow-sm transition-all hover:scale-[1.02] hover:shadow-md ${variantStyles[action.variant]}`}
          >
            <action.icon className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>

      <NewSaleDialog open={newSaleOpen} onOpenChange={setNewSaleOpen} />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} />
    </>
  );
};
