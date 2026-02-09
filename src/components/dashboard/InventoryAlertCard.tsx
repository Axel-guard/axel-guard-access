import { Package, AlertTriangle, XCircle, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInventorySummary } from "@/hooks/useInventory";

interface InventoryItemProps {
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

const InventoryItem = ({ label, count, icon: Icon, colorClass, bgClass }: InventoryItemProps) => (
  <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2 sm:p-3">
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={cn("flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg", bgClass)}>
        <Icon className={cn("h-3 w-3 sm:h-4 sm:w-4", colorClass)} />
      </div>
      <span className="text-xs sm:text-sm font-medium text-foreground">{label}</span>
    </div>
    <span className={cn("text-base sm:text-lg font-bold", colorClass)}>{count}</span>
  </div>
);

export const InventoryAlertCard = () => {
  const { data: inventorySummary, isLoading } = useInventorySummary();

  const inStock = inventorySummary?.inStock || 0;
  const dispatched = inventorySummary?.dispatched || 0;
  const qcPassed = inventorySummary?.qcPass || 0;
  
  // Calculate low stock as items with less than 10 in stock (example threshold)
  const lowStock = 0; // This would need actual data from backend
  const outOfStock = 0; // This would need actual data from backend

  if (isLoading) {
    return (
      <div className="rounded-[14px] border border-border/50 bg-card p-3 sm:p-5 shadow-card">
        <div className="animate-pulse space-y-3 sm:space-y-4">
          <div className="h-5 sm:h-6 w-28 sm:w-32 rounded bg-muted" />
          <div className="space-y-2 sm:space-y-3">
            <div className="h-12 sm:h-14 rounded-xl bg-muted" />
            <div className="h-12 sm:h-14 rounded-xl bg-muted" />
            <div className="h-12 sm:h-14 rounded-xl bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[14px] border border-border/50 bg-card p-3 sm:p-5 shadow-card">
      <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-primary/10">
          <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground">Inventory Status</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Live stock levels</p>
        </div>
      </div>

      <div className="space-y-1.5 sm:space-y-2">
        <InventoryItem
          label="In Stock"
          count={inStock}
          icon={CheckCircle}
          colorClass="text-success"
          bgClass="bg-success/10"
        />
        <InventoryItem
          label="QC Passed"
          count={qcPassed}
          icon={CheckCircle}
          colorClass="text-info"
          bgClass="bg-info/10"
        />
        <InventoryItem
          label="Dispatched"
          count={dispatched}
          icon={Package}
          colorClass="text-warning"
          bgClass="bg-warning/10"
        />
      </div>
    </div>
  );
};
