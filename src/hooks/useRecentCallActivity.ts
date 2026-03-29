import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CallActivityItem {
  id: string;
  lead_id?: string | null;
  customer_code?: string | null;
  customer_name?: string;
  company_name?: string;
  mobile_number?: string;
  call_status: string;
  call_type?: string;
  disposition?: string | null;
  notes?: string | null;
  user_name?: string | null;
  pipeline_stage?: string;
  created_at: string;
  next_followup?: { date: string; time?: string } | null;
}

export const useRecentCallActivity = (limit = 50) => {
  return useQuery({
    queryKey: ["recent-call-activity", limit],
    queryFn: async (): Promise<CallActivityItem[]> => {
      const { data: logs, error: logsErr } = await supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      // Table might not exist yet — return empty gracefully
      if (logsErr) {
        if (logsErr.code === "PGRST205" || logsErr.message?.includes("schema cache")) return [];
        throw logsErr;
      }
      if (!logs || logs.length === 0) return [];

      // Unique lead_ids and customer_codes
      const leadIds      = [...new Set(logs.filter((l) => l.lead_id).map((l) => l.lead_id as string))];
      const customerCodes = [...new Set(logs.filter((l) => l.customer_code).map((l) => l.customer_code as string))];

      // Fetch leads by id
      let leads: any[] = [];
      if (leadIds.length > 0) {
        const { data } = await supabase
          .from("leads")
          .select("id, customer_code, customer_name, company_name, mobile_number, pipeline_stage")
          .in("id", leadIds);
        leads = data ?? [];
      }

      // Fetch any remaining by customer_code (logs without lead_id)
      const foundIds = new Set(leads.map((l) => l.id));
      const missingCodes = customerCodes.filter((c) => !leads.find((l) => l.customer_code === c));
      if (missingCodes.length > 0) {
        const { data } = await supabase
          .from("leads")
          .select("id, customer_code, customer_name, company_name, mobile_number, pipeline_stage")
          .in("customer_code", missingCodes);
        if (data) leads.push(...data);
      }

      const leadById: Record<string, any>   = {};
      const leadByCode: Record<string, any> = {};
      for (const l of leads) {
        if (l.id)            leadById[l.id]             = l;
        if (l.customer_code) leadByCode[l.customer_code] = l;
      }

      // Fetch earliest pending follow_up per lead
      const allLeadIds = leads.map((l) => l.id).filter(Boolean);
      const followupMap: Record<string, { date: string; time?: string }> = {};
      if (allLeadIds.length > 0) {
        const { data: fus } = await supabase
          .from("follow_ups")
          .select("lead_id, scheduled_date, scheduled_time")
          .in("lead_id", allLeadIds)
          .eq("status", "Pending")
          .order("scheduled_date", { ascending: true });

        for (const fu of fus ?? []) {
          if (fu.lead_id && !followupMap[fu.lead_id]) {
            followupMap[fu.lead_id] = { date: fu.scheduled_date, time: fu.scheduled_time };
          }
        }
      }

      return logs.map((log) => {
        const lead =
          (log.lead_id && leadById[log.lead_id]) ||
          (log.customer_code && leadByCode[log.customer_code]);
        const followup = lead?.id ? followupMap[lead.id] ?? null : null;

        return {
          id:             log.id,
          lead_id:        log.lead_id,
          customer_code:  log.customer_code || lead?.customer_code,
          customer_name:  lead?.customer_name,
          company_name:   lead?.company_name,
          mobile_number:  lead?.mobile_number,
          call_status:    log.call_status,
          call_type:      log.call_type,
          disposition:    log.disposition,
          notes:          log.notes,
          user_name:      log.user_name,
          pipeline_stage: lead?.pipeline_stage,
          created_at:     log.created_at,
          next_followup:  followup,
        };
      });
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
};
