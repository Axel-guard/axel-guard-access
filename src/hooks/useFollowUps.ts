import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { startOfDay, endOfDay, addDays, subDays, format } from "date-fns";

export interface FollowUp {
  id: string;
  lead_id: string | null;
  customer_code: string | null;
  call_log_id: string | null;
  scheduled_date: string;
  scheduled_time: string | null;
  assigned_to: string | null;
  notes: string | null;
  status: string;  // Pending | Completed | Missed
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  // Joined from leads
  customer_name?: string;
  company_name?: string;
  mobile_number?: string;
  pipeline_stage?: string;
  last_call_status?: string;
}

export const useFollowUps = (filter?: { assignedTo?: string; stage?: string }) => {
  return useQuery({
    queryKey: ["follow-ups", "all", filter],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");

      // Fetch all pending follow-ups
      let query = supabase
        .from("follow_ups")
        .select("*")
        .order("scheduled_date", { ascending: true });

      if (filter?.assignedTo) {
        query = query.eq("assigned_to", filter.assignedTo);
      }

      const { data: followUps, error } = await query;
      if (error) throw error;

      const all = (followUps || []) as FollowUp[];

      // Enrich with lead data
      const leadIds = [...new Set(all.map(f => f.lead_id).filter(Boolean))] as string[];
      const customerCodes = [...new Set(all.map(f => f.customer_code).filter(Boolean))] as string[];

      let leadMap: Record<string, any> = {};
      if (leadIds.length > 0) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, customer_code, customer_name, company_name, mobile_number, pipeline_stage")
          .in("id", leadIds);
        (leads || []).forEach((l: any) => { leadMap[l.id] = l; });
      }
      if (customerCodes.length > 0) {
        const { data: leads } = await supabase
          .from("leads")
          .select("id, customer_code, customer_name, company_name, mobile_number, pipeline_stage")
          .in("customer_code", customerCodes);
        (leads || []).forEach((l: any) => {
          if (!leadMap[l.id]) leadMap[l.id] = l;
          leadMap[`code_${l.customer_code}`] = l;
        });
      }

      // Get last call status per lead
      const callMap: Record<string, string> = {};
      if (leadIds.length > 0) {
        const { data: calls } = await supabase
          .from("call_logs")
          .select("lead_id, call_status, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false });
        (calls || []).forEach((c: any) => {
          if (!callMap[c.lead_id]) callMap[c.lead_id] = c.call_status;
        });
      }

      const enriched = all.map(f => {
        const lead = f.lead_id ? leadMap[f.lead_id] : (f.customer_code ? leadMap[`code_${f.customer_code}`] : null);
        return {
          ...f,
          customer_name: lead?.customer_name || f.customer_code || "Unknown",
          company_name: lead?.company_name || null,
          mobile_number: lead?.mobile_number || null,
          pipeline_stage: lead?.pipeline_stage || null,
          last_call_status: f.lead_id ? callMap[f.lead_id] : null,
        };
      });

      // Apply stage filter after enrichment
      const filtered = filter?.stage && filter.stage !== "all"
        ? enriched.filter(f => f.pipeline_stage === filter.stage)
        : enriched;

      // Categorize
      const todayFollowUps = filtered.filter(f => f.scheduled_date === today && f.status === "Pending");
      const upcomingFollowUps = filtered.filter(f => f.scheduled_date > today && f.status === "Pending");
      const missedFollowUps = filtered.filter(f => f.scheduled_date < today && f.status === "Pending");

      return { todayFollowUps, upcomingFollowUps, missedFollowUps, all: filtered };
    },
  });
};

export const useUpdateFollowUpStatus = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("follow_ups")
        .update({ status, completed_at: status === "Completed" ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      toast.success("Follow-up updated!");
    },
  });
};

// CRM KPI counts for dashboard
export const useCrmKpis = () => {
  return useQuery({
    queryKey: ["crm-kpis"],
    queryFn: async () => {
      const today = format(new Date(), "yyyy-MM-dd");
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd = endOfDay(new Date()).toISOString();

      const [leadsRes, newLeadsRes, todayFURes, missedFURes, stageRes] = await Promise.all([
        supabase.from("leads").select("id", { count: "exact", head: true }),
        supabase.from("leads").select("id", { count: "exact", head: true })
          .gte("created_at", todayStart).lte("created_at", todayEnd),
        supabase.from("follow_ups").select("id", { count: "exact", head: true })
          .eq("scheduled_date", today).eq("status", "Pending"),
        supabase.from("follow_ups").select("id", { count: "exact", head: true })
          .lt("scheduled_date", today).eq("status", "Pending"),
        supabase.from("leads").select("pipeline_stage"),
      ]);

      const stageCounts: Record<string, number> = {
        "Suspect": 0, "Prospect": 0, "Approach": 0, "Negotiate": 0, "Order Done": 0,
      };
      (stageRes.data || []).forEach((l: any) => {
        const s = l.pipeline_stage || "Suspect";
        stageCounts[s] = (stageCounts[s] || 0) + 1;
      });

      return {
        totalLeads: leadsRes.count || 0,
        newLeadsToday: newLeadsRes.count || 0,
        followUpsToday: todayFURes.count || 0,
        missedFollowUps: missedFURes.count || 0,
        stageCounts,
      };
    },
    refetchInterval: 60000,
  });
};
