import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface InventoryItem {
  id: string;
  serial_number: string;
  product_name: string;
  status: string;
  qc_result: string | null;
  in_date: string | null;
  dispatch_date: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_city: string | null;
  order_id: string | null;
  category: string | null;
  qc_date: string | null;
  sd_connect: string | null;
  all_channels: string | null;
  network_test: string | null;
  gps_test: string | null;
  sim_slot: string | null;
  online_test: string | null;
  camera_quality: string | null;
  monitor_test: string | null;
  ip_address: string | null;
  checked_by: string | null;
  created_at: string;
}

export const useInventory = () => {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      // Fetch all records without the default 1000 limit
      const allData: InventoryItem[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("inventory")
          .select("*")
          .order("updated_at", { ascending: false })
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        allData.push(...(data as InventoryItem[]));
        
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      return allData;
    },
  });
};

export const useInventorySummary = () => {
  return useQuery({
    queryKey: ["inventory-summary"],
    queryFn: async () => {
      // Fetch all records without the default 1000 limit
      const items: InventoryItem[] = [];
      let from = 0;
      const pageSize = 1000;
      
      while (true) {
        const { data, error } = await supabase
          .from("inventory")
          .select("*")
          .range(from, from + pageSize - 1);

        if (error) throw error;
        if (!data || data.length === 0) break;
        
        items.push(...(data as InventoryItem[]));
        
        if (data.length < pageSize) break;
        from += pageSize;
      }
      
      // Calculate summary stats
      const totalItems = items.length;
      // In Stock = status is "In Stock" AND QC result is NOT "Fail"
      const inStock = items.filter(i => i.status === 'In Stock' && i.qc_result !== 'Fail').length;
      const dispatched = items.filter(i => i.status === 'Dispatched').length;
      const qcPending = items.filter(i => i.qc_result === 'Pending' || !i.qc_result).length;
      const qcPass = items.filter(i => i.qc_result === 'Pass').length;
      const qcFail = items.filter(i => i.qc_result === 'Fail').length;

      // Group by product
      const byProduct = items.reduce((acc, item) => {
        if (!acc[item.product_name]) {
          acc[item.product_name] = { total: 0, inStock: 0, dispatched: 0 };
        }
        acc[item.product_name].total++;
        if (item.status === 'In Stock') acc[item.product_name].inStock++;
        if (item.status === 'Dispatched') acc[item.product_name].dispatched++;
        return acc;
      }, {} as Record<string, { total: number; inStock: number; dispatched: number }>);

      return {
        totalItems,
        inStock,
        dispatched,
        qcPending,
        qcPass,
        qcFail,
        byProduct,
      };
    },
  });
};
