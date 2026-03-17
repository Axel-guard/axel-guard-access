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

export interface PendencyRecords {
  balancePayment: any[];
  dispatchPending: any[];
  trackingPending: any[];
  qcPending: any[];
  pendingTickets: any[];
}

export const usePendency = () => {
  const { data: allSales, isLoading: salesLoading } = useAllDispatchSales();
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();

  const allOrderIds = useMemo(() => (allSales || []).map(s => s.order_id), [allSales]);

  const { data: allSaleItems, isLoading: saleItemsLoading } = useQuery({
    queryKey: ["dispatch-sale-items", allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) chunks.push(allOrderIds.slice(i, i + 500));
      const results = await Promise.all(chunks.map(async chunk => {
        const { data, error } = await supabase.from("sale_items").select("*").in("order_id", chunk);
        if (error) throw error;
        return data || [];
      }));
      return results.flat();
    },
    enabled: allOrderIds.length > 0,
    refetchInterval: 10000,
  });

  const { data: dispatchedInventory, isLoading: invDispatchLoading } = useQuery({
    queryKey: ["dispatch-inventory-status", allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) chunks.push(allOrderIds.slice(i, i + 500));
      const results = await Promise.all(chunks.map(async chunk => {
        const { data, error } = await supabase.from("inventory").select("order_id").eq("status", "Dispatched").in("order_id", chunk);
        if (error) throw error;
        return data || [];
      }));
      return results.flat();
    },
    enabled: allOrderIds.length > 0,
    refetchInterval: 10000,
  });

  const { data: productTypesData } = useQuery({
    queryKey: ["product-types-map"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("product_name, product_type");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach(p => {
        map[p.product_name] = p.product_name === "MDVR Connector" ? "service" : (p.product_type || "physical");
      });
      return map;
    },
  });

  // QC Pending records
  const { data: qcPendingRecords, isLoading: qcLoading } = useQuery({
    queryKey: ["pendency-qc-records"],
    queryFn: async () => {
      const allRecords: any[] = [];
      let from = 0;
      const PAGE = 1000;
      let hasMore = true;
      while (hasMore) {
        const { data, error } = await supabase
          .from("inventory")
          .select("id, serial_number, product_name, category, in_date, qc_result, status")
          .eq("qc_result", "Pending")
          .order("in_date", { ascending: false })
          .range(from, from + PAGE - 1);
        if (error) throw error;
        if (data && data.length > 0) { allRecords.push(...data); from += PAGE; hasMore = data.length === PAGE; }
        else hasMore = false;
      }
      return allRecords;
    },
    refetchInterval: 10000,
  });

  // Pending Tickets records
  const { data: ticketRecords, isLoading: ticketsLoading } = useQuery({
    queryKey: ["pendency-ticket-records"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, title, status, priority, customer_name, company_name, assigned_to, created_at")
        .neq("status", "Closed")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    refetchInterval: 10000,
  });

  const result = useMemo(() => {
    const isServiceProduct = (name: string) => (productTypesData || {})[name] === "service";

    // Balance Payment Pending
    const balanceRecords = (allSales || []).filter(s => Number(s.balance_amount) > 0);

    // Dispatch Pending
    const dispatchRecords: any[] = [];
    (allSales || []).forEach(sale => {
      if ((sale as any).dispatch_status_override === "Done") return;
      const orderSaleItems = (allSaleItems || []).filter(i => i.order_id === sale.order_id);
      const totalItems = orderSaleItems.reduce((sum, i) => sum + Number(i.quantity), 0);
      const physicalDispatched = (dispatchedInventory || []).filter(i => i.order_id === sale.order_id).length;
      const orderHasShipment = (shipments || []).some(s => s.order_id === sale.order_id);
      const serviceDispatched = orderHasShipment
        ? orderSaleItems.filter(i => isServiceProduct(i.product_name)).reduce((sum, i) => sum + Number(i.quantity), 0)
        : 0;
      const dispatched = physicalDispatched + serviceDispatched;
      if (dispatched < totalItems || (dispatched === 0 && totalItems === 0)) {
        dispatchRecords.push({ ...sale, totalItems, dispatched, remaining: totalItems - dispatched });
      }
    });

    // Tracking Pending - only from today onwards (IST timezone)
    const todayIST = new Date();
    // IST is UTC+5:30, get start of today in IST then convert to UTC
    const istOffset = 5.5 * 60 * 60 * 1000;
    const nowUTC = todayIST.getTime();
    const nowIST = new Date(nowUTC + istOffset);
    const startOfTodayIST = new Date(nowIST.getFullYear(), nowIST.getMonth(), nowIST.getDate());
    const startOfTodayUTC = new Date(startOfTodayIST.getTime() - istOffset);

    const trackingRecords = (shipments || []).filter(s => {
      if (s.tracking_id && s.tracking_id.trim() !== "") return false; // has tracking, skip
      const createdAt = new Date(s.created_at || 0);
      return createdAt >= startOfTodayUTC;
    });

    const records: PendencyRecords = {
      balancePayment: balanceRecords,
      dispatchPending: dispatchRecords,
      trackingPending: trackingRecords,
      qcPending: qcPendingRecords || [],
      pendingTickets: ticketRecords || [],
    };

    const counts: PendencyCounts = {
      balancePayment: records.balancePayment.length,
      dispatchPending: records.dispatchPending.length,
      trackingPending: records.trackingPending.length,
      qcPending: records.qcPending.length,
      pendingTickets: records.pendingTickets.length,
    };

    return { counts, records };
  }, [allSales, allSaleItems, dispatchedInventory, shipments, productTypesData, qcPendingRecords, ticketRecords]);


  const isLoading = salesLoading || shipmentsLoading || saleItemsLoading || invDispatchLoading || qcLoading || ticketsLoading;

  return { counts: result.counts, records: result.records, isLoading };
};
