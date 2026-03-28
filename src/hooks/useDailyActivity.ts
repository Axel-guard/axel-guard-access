import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo } from "react";

export const useDailyActivity = (dateFrom: string, dateTo: string) => {
  // Sales for the date range
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ["daily-activity-sales", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("order_id, customer_name, company_name, employee_name, total_amount, amount_received, sale_date")
        .gte("sale_date", dateFrom)
        .lte("sale_date", dateTo)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dateFrom && !!dateTo,
  });

  // Quotations for the date range
  const { data: quotationsData, isLoading: quotationsLoading } = useQuery({
    queryKey: ["daily-activity-quotations", dateFrom, dateTo],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("id, quotation_no, quotation_date, customer_name, company_name, grand_total, status")
        .gte("quotation_date", dateFrom)
        .lte("quotation_date", dateTo)
        .order("quotation_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!dateFrom && !!dateTo,
  });

  // Balance payments received for the date range
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["daily-activity-payments", dateFrom, dateTo],
    queryFn: async () => {
      const { data: paymentData, error } = await supabase
        .from("payment_history")
        .select("id, order_id, payment_date, amount, account_received, payment_reference")
        .gte("payment_date", dateFrom)
        .lte("payment_date", dateTo)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      if (!paymentData || paymentData.length === 0) return [];

      const orderIds = [...new Set(paymentData.map((p) => p.order_id))];
      const { data: salesInfo } = await supabase
        .from("sales")
        .select("order_id, customer_name, company_name")
        .in("order_id", orderIds);

      const salesMap = new Map((salesInfo || []).map((s) => [s.order_id, s]));

      return paymentData.map((p) => ({
        ...p,
        customer_name: salesMap.get(p.order_id)?.customer_name ?? "—",
        company_name: salesMap.get(p.order_id)?.company_name ?? "—",
      }));
    },
    enabled: !!dateFrom && !!dateTo,
  });

  const salesSummary = useMemo(() => ({
    count: (salesData || []).length,
    total: (salesData || []).reduce((sum, s) => sum + Number(s.total_amount || 0), 0),
  }), [salesData]);

  const quotationsSummary = useMemo(() => ({
    count: (quotationsData || []).length,
    total: (quotationsData || []).reduce((sum, q) => sum + Number(q.grand_total || 0), 0),
  }), [quotationsData]);

  const paymentsSummary = useMemo(() => ({
    count: (paymentsData || []).length,
    total: (paymentsData || []).reduce((sum, p) => sum + Number(p.amount || 0), 0),
  }), [paymentsData]);

  return {
    salesData: salesData || [],
    quotationsData: quotationsData || [],
    paymentsData: paymentsData || [],
    salesSummary,
    quotationsSummary,
    paymentsSummary,
    isLoading: salesLoading || quotationsLoading || paymentsLoading,
  };
};
