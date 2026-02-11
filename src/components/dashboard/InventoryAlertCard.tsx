import { CheckCircle, Clock, Truck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface DispatchItemProps {
  label: string;
  count: number;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
  onClick?: () => void;
  isActive?: boolean;
}

const DispatchItem = ({ label, count, icon: Icon, colorClass, bgClass, onClick, isActive }: DispatchItemProps) => (
  <div
    onClick={onClick}
    className={cn(
      "flex items-center justify-between rounded-xl bg-muted/50 p-2 sm:p-3 cursor-pointer transition-all duration-200 hover:scale-[1.02]",
      isActive && "ring-2 ring-offset-1 ring-primary/40 shadow-md",
      onClick && "hover:shadow-sm"
    )}
  >
    <div className="flex items-center gap-2 sm:gap-3">
      <div className={cn("flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded-lg", bgClass)}>
        <Icon className={cn("h-3 w-3 sm:h-4 sm:w-4", colorClass)} />
      </div>
      <span className="text-xs sm:text-sm font-medium text-foreground">{label}</span>
    </div>
    <span className={cn("text-base sm:text-lg font-bold", colorClass)}>{count}</span>
  </div>
);

const useDispatchStatus = () => {
  return useQuery({
    queryKey: ["dispatch-status-current-month"],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const today = now.toISOString().split("T")[0];

      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("order_id")
        .gte("sale_date", firstDay)
        .lte("sale_date", today + "T23:59:59.999Z");

      if (salesError) throw salesError;
      if (!sales || sales.length === 0) {
        return { done: 0, pending: 0, total: 0 };
      }

      const totalSales = sales.length;
      const orderIds = sales.map(s => s.order_id);

      const { data: shipments, error: shipmentsError } = await supabase
        .from("shipments")
        .select("order_id")
        .in("order_id", orderIds);

      if (shipmentsError) throw shipmentsError;

      const dispatchedOrderIds = new Set(shipments?.map(s => s.order_id) || []);
      const done = dispatchedOrderIds.size;
      const pending = totalSales - done;

      return { done, pending, total: totalSales };
    },
  });
};

export const InventoryAlertCard = () => {
  const { data, isLoading } = useDispatchStatus();
  const navigate = useNavigate();

  const handleFilterClick = (filter: string) => {
    navigate(`/dispatch?status=${filter}`);
  };

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
          <p className="text-sm text-muted-foreground">No sales this month</p>
        </div>
      ) : (
        <div className="space-y-1.5 sm:space-y-2">
          <DispatchItem
            label="Dispatch Done"
            count={done}
            icon={CheckCircle}
            colorClass="text-success"
            bgClass="bg-success/10"
            onClick={() => handleFilterClick("completed")}
          />
          <DispatchItem
            label="Dispatch Pending"
            count={pending}
            icon={Clock}
            colorClass="text-warning"
            bgClass="bg-warning/10"
            onClick={() => handleFilterClick("pending")}
          />
          <DispatchItem
            label="Total Dispatch"
            count={total}
            icon={Truck}
            colorClass="text-info"
            bgClass="bg-info/10"
            onClick={() => handleFilterClick("all")}
          />
        </div>
      )}
    </div>
  );
};
