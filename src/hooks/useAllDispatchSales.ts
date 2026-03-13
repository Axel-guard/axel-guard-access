import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Sale } from "@/hooks/useSales";

// Fetch ALL sales for dispatch - no month filter, batch fetching to bypass 1000 row limit
export const useAllDispatchSales = () => {
  return useQuery({
    queryKey: ["all-dispatch-sales"],
    queryFn: async () => {
      const allSales: Sale[] = [];
      const PAGE_SIZE = 1000;
      let from = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await supabase
          .from("sales")
          .select("*")
          .order("order_id", { ascending: false })
          .range(from, from + PAGE_SIZE - 1);

        if (error) throw error;
        if (data && data.length > 0) {
          allSales.push(...(data as Sale[]));
          from += PAGE_SIZE;
          hasMore = data.length === PAGE_SIZE;
        } else {
          hasMore = false;
        }
      }

      return allSales;
    },
  });
};
