import { CheckCircle, Clock, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface DispatchItemProps {
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

const DispatchItem = ({ label, count, icon: Icon, colorClass, bgClass }: DispatchItemProps) => (
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

const useCurrentMonthDispatch = () => {
  return useQuery({
    queryKey: ["dispatch-status-current-month"],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];

      const allItems: any[] = [];
      let from = 0;
      const pageSize = 1000;

      while (true) {
        const { data, error } = await supabase
          .from("inventory")
          .select("status, dispatch_date")
          .eq("status", "Dispatched")
          .gte("dispatch_date", firstDay)
          .lte("dispatch_date", today)
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        allItems.push(...data);
        if (data.length < pageSize) break;
        from += pageSize;
      }

      // Also get pending dispatches: sales items that haven't been fully dispatched this month
      // For simplicity, dispatch done = dispatched inventory items this month
      const done = allItems.length;

      // Get shipments this month to calculate pending
      const { data: salesData, error: salesError } = await supabase
        .from("sales")
        .select("order_id, sale_date")
        .gte("sale_date", firstDay)
        .lte("sale_date", today);

      if (salesError) throw salesError;

      const totalOrders = salesData?.length || 0;
      // Count orders that have at least one dispatched item this month
      const dispatchedOrderIds = new Set(allItems.map(i => i.dispatch_date ? "dispatched" : null));

      // Simple approach: pending = total sales orders this month minus ones with dispatches
      const ordersWithDispatch = new Set<string>();
      // We need order_id from inventory for dispatched items
      const { data: dispatchedWithOrders } = await supabase
        .from("inventory")
        .select("order_id")
        .eq("status", "Dispatched")
        .gte("dispatch_date", firstDay)
        .lte("dispatch_date", today)
        .not("order_id", "is", null);

      if (dispatchedWithOrders) {
        dispatchedWithOrders.forEach(i => {
          if (i.order_id) ordersWithDispatch.add(i.order_id);
        });
      }

      const pendingOrders = salesData
        ? salesData.filter(s => !ordersWithDispatch.has(s.order_id)).length
        : 0;

      return {
        done,
        pending: pendingOrders,
        total: done + pendingOrders,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });
};

export const InventoryAlertCard = () => {
  const { data, isLoading } = useCurrentMonthDispatch();

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

  const done = data?.done || 0;
  const pending = data?.pending || 0;
  const total = data?.total || 0;
  const isEmpty = total === 0;

  return (
    <div className="rounded-[14px] border border-border/50 bg-card p-3 sm:p-5 shadow-card">
      <div className="mb-3 sm:mb-4 flex items-center gap-2 sm:gap-3">
        <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-lg bg-info/10">
          <Truck className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-info" />
        </div>
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-foreground">Dispatch Status</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground">Current month dispatch summary</p>
        </div>
      </div>

      {isEmpty ? (
        <div className="flex items-center justify-center rounded-xl bg-muted/50 p-6">
          <p className="text-sm text-muted-foreground">No dispatch records this month</p>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          <DispatchItem
            label="Dispatch Done"
            count={done}
            icon={CheckCircle}
            colorClass="text-success"
            bgClass="bg-success/10"
          />
          <DispatchItem
            label="Dispatch Pending"
            count={pending}
            icon={Clock}
            colorClass="text-warning"
            bgClass="bg-warning/10"
          />
          <DispatchItem
            label="Total Dispatch"
            count={total}
            icon={Truck}
            colorClass="text-info"
            bgClass="bg-info/10"
          />
        </div>
      )}
    </div>
  );
};
