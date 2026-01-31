import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Shipment {
  id: string;
  order_id: string | null;
  shipment_type: string;
  courier_partner: string | null;
  shipping_mode: string | null;
  tracking_id: string | null;
  weight_kg: number | null;
  shipping_cost: number | null;
  created_at: string;
}

export const useShipments = () => {
  return useQuery({
    queryKey: ["shipments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Shipment[];
    },
  });
};

export const useShipmentsSummary = () => {
  return useQuery({
    queryKey: ["shipments-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("*");

      if (error) throw error;
      
      const shipments = data as Shipment[];
      
      const totalShipments = shipments.length;
      const totalWeight = shipments.reduce((sum, s) => sum + (Number(s.weight_kg) || 0), 0);
      const totalShippingCost = shipments.reduce((sum, s) => sum + (Number(s.shipping_cost) || 0), 0);

      // Group by courier
      const byCourier = shipments.reduce((acc, s) => {
        const courier = s.courier_partner || 'Unknown';
        if (!acc[courier]) {
          acc[courier] = { count: 0, cost: 0 };
        }
        acc[courier].count++;
        acc[courier].cost += Number(s.shipping_cost) || 0;
        return acc;
      }, {} as Record<string, { count: number; cost: number }>);

      // Group by mode
      const byMode = shipments.reduce((acc, s) => {
        const mode = s.shipping_mode || 'Unknown';
        if (!acc[mode]) {
          acc[mode] = 0;
        }
        acc[mode]++;
        return acc;
      }, {} as Record<string, number>);

      return {
        totalShipments,
        totalWeight,
        totalShippingCost,
        byCourier,
        byMode,
      };
    },
  });
};
