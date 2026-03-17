import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAllDispatchSales } from "@/hooks/useAllDispatchSales";
import { useShipments } from "@/hooks/useShipments";
import { useMemo } from "react";

export interface PendencyCounts {
  balancePayment: number;
  dispatchPending: number;
  trackingPending: number;
  qcPending: number;
  pendingTickets: number;
}

/**
 * Reuses the exact same data sources as the actual module pages
 * to ensure counts always match.
 */
export const usePendency = () => {
  // Reuse the same hooks the Dispatch page uses
  const { data: allSales, isLoading: salesLoading } = useAllDispatchSales();
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();

  // Fetch sale_items for dispatch status calculation (same as Dispatch page)
  const allOrderIds = useMemo(() => (allSales || []).map(s => s.order_id), [allSales]);

  const { data: allSaleItems, isLoading: saleItemsLoading } = useQuery({
    queryKey: ["dispatch-sale-items", allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) {
        chunks.push(allOrderIds.slice(i, i + 500));
      }
      const results = await Promise.all(chunks.map(async chunk => {
        const { data, error } = await supabase.from("sale_items").select("*").in("order_id", chunk);
        if (error) throw error;
        return data || [];
      }));
      return results.flat();
    },
    enabled: allOrderIds.length > 0,
  });

  const { data: dispatchedInventory, isLoading: invDispatchLoading } = useQuery({
    queryKey: ["dispatch-inventory-status", allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) {
        chunks.push(allOrderIds.slice(i, i + 500));
      }
      const results = await Promise.all(chunks.map(async chunk => {
        const { data, error } = await supabase.from("inventory").select("order_id").eq("status", "Dispatched").in("order_id", chunk);
        if (error) throw error;
        return data || [];
      }));
      return results.flat();
    },
    enabled: allOrderIds.length > 0,
  });

  const { data: productTypesData } = useQuery({
    queryKey: ["product-types-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("product_name, product_type");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach(p => {
        const isSkip = p.product_name === "MDVR Connector";
        map[p.product_name] = isSkip ? "service" : (p.product_type || "physical");
      });
      return map;
    },
  });

  // QC Pending count
  const { data: qcPendingData, isLoading: qcLoading } = useQuery({
    queryKey: ["pendency-qc"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("inventory")
        .select("*", { count: "exact", head: true })
        .eq("qc_result", "Pending");
      if (error) throw error;
      return count || 0;
    },
  });

  // Pending Tickets count (tasks table, status != 'Closed')
  const { data: ticketsData, isLoading: ticketsLoading } = useQuery({
    queryKey: ["pendency-tickets"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("tasks")
        .select("*", { count: "exact", head: true })
        .neq("status", "Closed");
      if (error) throw error;
      return count || 0;
    },
  });

  // Compute dispatch-related counts using exact same logic as Dispatch page
  const counts = useMemo<PendencyCounts>(() => {
    const isServiceProduct = (name: string) => (productTypesData || {})[name] === "service";

    // Balance Payment Pending
    const balancePayment = (allSales || []).filter(s => Number(s.balance_amount) > 0).length;

    // Dispatch Pending (same getOrderStatus logic as Dispatch page)
    let dispatchPending = 0;
    (allSales || []).forEach(sale => {
      if ((sale as any).dispatch_status_override === "Done") return; // Completed

      const orderSaleItems = (allSaleItems || []).filter(i => i.order_id === sale.order_id);
      const totalItems = orderSaleItems.reduce((sum, i) => sum + Number(i.quantity), 0);
      const physicalDispatched = (dispatchedInventory || []).filter(i => i.order_id === sale.order_id).length;
      const orderHasShipment = (shipments || []).some(s => s.order_id === sale.order_id);
      const serviceDispatched = orderHasShipment
        ? orderSaleItems.filter(i => isServiceProduct(i.product_name)).reduce((sum, i) => sum + Number(i.quantity), 0)
        : 0;
      const dispatched = physicalDispatched + serviceDispatched;

      if (dispatched === 0) dispatchPending++;
      else if (dispatched < totalItems) dispatchPending++;
      // else Completed – don't count
    });

    // Tracking Pending: shipments without tracking_id
    const trackingPending = (shipments || []).filter(
      s => !s.tracking_id || s.tracking_id.trim() === ""
    ).length;

    return {
      balancePayment,
      dispatchPending,
      trackingPending,
      qcPending: qcPendingData || 0,
      pendingTickets: ticketsData || 0,
    };
  }, [allSales, allSaleItems, dispatchedInventory, shipments, productTypesData, qcPendingData, ticketsData]);

  const isLoading = salesLoading || shipmentsLoading || saleItemsLoading || invDispatchLoading || qcLoading || ticketsLoading;

  return { counts, isLoading };
};
