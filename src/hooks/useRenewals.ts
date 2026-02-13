import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { differenceInDays, addDays } from "date-fns";

export interface Renewal {
  id: string;
  order_id: string;
  customer_code: string | null;
  customer_name: string | null;
  company_name: string | null;
  product_type: string;
  product_name: string | null;
  dispatch_date: string;
  renewal_start_date: string;
  renewal_end_date: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// Check if a product is renewal-applicable using the DB flag
export const checkRenewalApplicable = async (productName: string): Promise<boolean> => {
  const { data } = await supabase
    .from("products")
    .select("renewal_applicable")
    .eq("product_name", productName)
    .maybeSingle();
  return data?.renewal_applicable === true;
};

// Calculate days remaining
export const getDaysRemaining = (endDate: string): number => {
  return differenceInDays(new Date(endDate), new Date());
};

// Get status based on days remaining
export const getRenewalStatus = (daysRemaining: number): string => {
  if (daysRemaining <= 0) return "Expired";
  if (daysRemaining <= 30) return "Expiring Soon";
  return "Active";
};

// Fetch all renewals
export const useRenewals = () => {
  return useQuery({
    queryKey: ["renewals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewals")
        .select("*")
        .order("renewal_end_date", { ascending: true });

      if (error) throw error;
      
      // Update status based on current date
      return (data as Renewal[]).map(renewal => {
        const daysRemaining = getDaysRemaining(renewal.renewal_end_date);
        const currentStatus = getRenewalStatus(daysRemaining);
        return {
          ...renewal,
          status: currentStatus,
          daysRemaining
        };
      });
    },
  });
};

// Fetch renewal summary
export const useRenewalsSummary = () => {
  return useQuery({
    queryKey: ["renewals-summary"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("renewals")
        .select("*");

      if (error) throw error;
      
      const renewals = data as Renewal[];
      
      let active = 0;
      let expiringSoon = 0;
      let expired = 0;
      
      renewals.forEach(renewal => {
        const daysRemaining = getDaysRemaining(renewal.renewal_end_date);
        const status = getRenewalStatus(daysRemaining);
        
        if (status === "Active") active++;
        else if (status === "Expiring Soon") expiringSoon++;
        else expired++;
      });

      return {
        total: renewals.length,
        active,
        expiringSoon,
        expired
      };
    },
  });
};

// Create renewal
export const useCreateRenewal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (renewal: Omit<Renewal, "id" | "created_at" | "updated_at" | "status">) => {
      const { data, error } = await supabase
        .from("renewals")
        .insert({
          ...renewal,
          status: "Active"
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewals"] });
      queryClient.invalidateQueries({ queryKey: ["renewals-summary"] });
    },
    onError: (error) => {
      console.error("Failed to create renewal:", error);
    },
  });
};

// Renew subscription (add 364 days)
export const useRenewSubscription = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      // First get the current renewal
      const { data: current, error: fetchError } = await supabase
        .from("renewals")
        .select("*")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new end date (current end date + 364 days)
      const currentEndDate = new Date(current.renewal_end_date);
      const newEndDate = addDays(currentEndDate, 364);

      const { data, error } = await supabase
        .from("renewals")
        .update({
          renewal_end_date: newEndDate.toISOString(),
          status: "Active"
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewals"] });
      queryClient.invalidateQueries({ queryKey: ["renewals-summary"] });
      toast.success("Subscription renewed for 364 days!");
    },
    onError: (error) => {
      toast.error(`Failed to renew: ${error.message}`);
    },
  });
};

// Delete renewal
export const useDeleteRenewal = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("renewals")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["renewals"] });
      queryClient.invalidateQueries({ queryKey: ["renewals-summary"] });
      toast.success("Renewal record deleted!");
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
    },
  });
};
