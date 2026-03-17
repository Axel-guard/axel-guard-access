import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PendencyData {
  balancePayment: { count: number; records: any[] };
  dispatchPending: { count: number; records: any[] };
  trackingPending: { count: number; records: any[] };
  qcPending: { count: number; records: any[] };
  pendingTickets: { count: number; records: any[] };
}

export const usePendency = () => {
  return useQuery({
    queryKey: ["pendency"],
    queryFn: async (): Promise<PendencyData> => {
      const [balanceRes, salesRes, shipmentsRes, inventoryRes, ticketsRes] = await Promise.all([
        // Balance Payment Pending - sales with balance > 0
        supabase
          .from("sales")
          .select("order_id, customer_name, company_name, customer_code, employee_name, total_amount, amount_received, balance_amount, sale_date")
          .gt("balance_amount", 0)
          .order("sale_date", { ascending: false }),

        // All sales for dispatch check
        supabase
          .from("sales")
          .select("order_id, customer_name, company_name, customer_code, employee_name, sale_date, dispatch_status_override")
          .order("sale_date", { ascending: false }),

        // All shipments for tracking & dispatch cross-reference
        supabase
          .from("shipments")
          .select("order_id, tracking_id, courier_partner, shipping_mode, created_at"),

        // QC Pending
        supabase
          .from("inventory")
          .select("id, serial_number, product_name, category, in_date, qc_result, status")
          .eq("qc_result", "Pending")
          .order("in_date", { ascending: false }),

        // Pending Tickets (not closed)
        supabase
          .from("tasks")
          .select("id, title, ticket_no:id, status, priority, customer_name, company_name, assigned_to, created_at")
          .neq("status", "Closed")
          .order("created_at", { ascending: false }),
      ]);

      // Dispatch Pending: sales that have no shipment at all OR dispatch_status_override is not 'Completed'
      const shippedOrderIds = new Set(
        (shipmentsRes.data || []).map((s) => s.order_id)
      );
      const dispatchPendingRecords = (salesRes.data || []).filter(
        (sale) =>
          !shippedOrderIds.has(sale.order_id) &&
          sale.dispatch_status_override !== "Completed"
      );

      // Tracking Pending: shipments with no tracking_id
      const trackingPendingRecords = (shipmentsRes.data || []).filter(
        (s) => !s.tracking_id || s.tracking_id.trim() === ""
      );

      return {
        balancePayment: {
          count: (balanceRes.data || []).length,
          records: balanceRes.data || [],
        },
        dispatchPending: {
          count: dispatchPendingRecords.length,
          records: dispatchPendingRecords,
        },
        trackingPending: {
          count: trackingPendingRecords.length,
          records: trackingPendingRecords,
        },
        qcPending: {
          count: (inventoryRes.data || []).length,
          records: inventoryRes.data || [],
        },
        pendingTickets: {
          count: (ticketsRes.data || []).length,
          records: ticketsRes.data || [],
        },
      };
    },
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });
};
