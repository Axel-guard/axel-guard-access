import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

export type ShipmentInsert = Omit<Shipment, "id" | "created_at">;
export type ShipmentUpdate = Partial<ShipmentInsert>;

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
      // Get current month boundaries
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const { data, error } = await supabase
        .from("shipments")
        .select("*")
        .gte("created_at", startOfMonth.toISOString())
        .lt("created_at", endOfMonth.toISOString());

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

// Create shipment
export const useCreateShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (shipment: ShipmentInsert) => {
      const { data, error } = await supabase
        .from("shipments")
        .insert(shipment)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments-summary"] });
      toast.success("Tracking details saved successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
};

// Update shipment
export const useUpdateShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: ShipmentUpdate }) => {
      const { data, error } = await supabase
        .from("shipments")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments-summary"] });
      toast.success("Tracking details updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    },
  });
};

// Delete shipment
export const useDeleteShipment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("shipments")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments-summary"] });
      toast.success("Tracking record deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
};
