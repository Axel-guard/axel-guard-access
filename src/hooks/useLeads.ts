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
  pipeline_stage?: string;
  assigned_to?: string;
  source?: string;
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

// Get next customer code (last code + 1)
export const useNextCustomerCode = () => {
  return useQuery({
    queryKey: ["leads", "nextCode"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("customer_code")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;

      if (!data || data.length === 0) {
        return "1001"; // Starting code if no leads exist
      }

      // Find the highest numeric code
      let maxCode = 1000;
      for (const lead of data) {
        const numericCode = parseInt(lead.customer_code.replace(/\D/g, '')) || 0;
        if (numericCode > maxCode) {
          maxCode = numericCode;
        }
      }

      return String(maxCode + 1);
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
    mutationFn: async ({ id, updates, changedBy, fromStage }: {
      id: string;
      updates: Partial<Lead>;
      changedBy?: string;
      fromStage?: string;
    }) => {
      const { error } = await supabase.from("leads").update(updates).eq("id", id);
      if (error) throw error;

      // Record stage change in history
      if (updates.pipeline_stage) {
        await supabase.from("lead_stage_history").insert({
          lead_id:    id,
          from_stage: fromStage ?? null,
          to_stage:   updates.pipeline_stage,
          changed_by: changedBy ?? null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-enriched"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kpis"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales-balance"] });
      queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["customer-search"] });
      toast.success("Lead updated successfully!");
    },
    onError: (error) => {
      toast.error(`Failed to update lead: ${error.message}`);
    },
  });
};

// Bulk update many leads at once
export const useBulkUpdateLeads = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ ids, updates }: { ids: string[]; updates: Partial<Lead> }) => {
      const { error } = await supabase.from("leads").update(updates).in("id", ids);
      if (error) throw error;
    },
    onSuccess: (_, { ids }) => {
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["leads-enriched"] });
      queryClient.invalidateQueries({ queryKey: ["crm-kpis"] });
      toast.success(`${ids.length} lead${ids.length > 1 ? "s" : ""} updated!`);
    },
    onError: (error) => {
      toast.error(`Bulk update failed: ${error.message}`);
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
