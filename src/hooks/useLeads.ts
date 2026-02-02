import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface Lead {
  id?: string;
  customer_code: string;
  customer_name: string;
  mobile_number: string;
  alternate_mobile?: string;
  location?: string;
  company_name?: string;
  gst_number?: string;
  email?: string;
  complete_address?: string;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// Fetch all leads (pagination to bypass 1000-row API response limit)
// Sorted by customer_code as numeric value (ascending by default)
export const useLeads = (sortDescending: boolean = false) => {
  return useQuery({
    queryKey: ["leads", "all", sortDescending ? "desc" : "asc"],
    queryFn: async () => {
      const pageSize = 1000;
      const all: Lead[] = [];

      for (let page = 0; ; page++) {
        const from = page * pageSize;
        const to = from + pageSize - 1;

        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .range(from, to);

        if (error) throw error;

        const rows = (data ?? []) as Lead[];
        all.push(...rows);

        if (rows.length < pageSize) break;
      }

      // Sort by customer_code as numeric value
      all.sort((a, b) => {
        const numA = parseInt(a.customer_code.replace(/\D/g, '')) || 0;
        const numB = parseInt(b.customer_code.replace(/\D/g, '')) || 0;
        return sortDescending ? numB - numA : numA - numB;
      });

      return all;
    },
  });
};

// Create new lead
export const useCreateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (lead: Omit<Lead, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("leads")
        .insert(lead)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead added successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to add lead: ${error.message}`);
    },
  });
};

// Update lead
export const useUpdateLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Lead> }) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
};

// Delete lead
export const useDeleteLead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      toast.success("Lead deleted successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to delete lead: ${error.message}`);
    },
  });
};
