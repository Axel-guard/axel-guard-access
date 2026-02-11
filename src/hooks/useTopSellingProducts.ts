import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface TopSellingProduct {
  productName: string;
  unitsSold: number;
  totalRevenue: number;
}

export const useTopSellingProducts = () => {
  return useQuery({
    queryKey: ["top-selling-products-this-month"],
    queryFn: async () => {
      const now = new Date();
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

      // Fetch current month sales order_ids
      const { data: sales, error: salesError } = await supabase
        .from("sales")
        .select("order_id")
        .gte("sale_date", firstDay)
        .lt("sale_date", today);

      if (salesError) throw salesError;
      if (!sales || sales.length === 0) return [];

      const orderIds = sales.map((s) => s.order_id);

      // Fetch sale_items for those orders
      const allItems: any[] = [];
      const chunkSize = 200;
      for (let i = 0; i < orderIds.length; i += chunkSize) {
        const chunk = orderIds.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("sale_items")
          .select("product_name, quantity, unit_price")
          .in("order_id", chunk);
        if (error) throw error;
        if (data) allItems.push(...data);
      }

      // Aggregate by product_name
      const agg: Record<string, { unitsSold: number; totalRevenue: number }> = {};
      for (const item of allItems) {
        const name = item.product_name || "Unknown";
        if (!agg[name]) agg[name] = { unitsSold: 0, totalRevenue: 0 };
        agg[name].unitsSold += Number(item.quantity) || 0;
        agg[name].totalRevenue += (Number(item.quantity) || 0) * (Number(item.unit_price) || 0);
      }

      return Object.entries(agg)
        .map(([productName, stats]) => ({ productName, ...stats }))
        .sort((a, b) => b.unitsSold - a.unitsSold)
        .slice(0, 5) as TopSellingProduct[];
    },
  });
};
