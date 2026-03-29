import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Lead } from "./useLeads";

export interface EnrichedLead extends Lead {
  next_followup: { date: string; time: string | null } | null;
  last_call_status: string | null;
  last_call_disposition: string | null;
  last_call_date: string | null;
  fy_revenue: number;
}

export const useLeadsEnriched = (sortDescending: boolean = false) => {
  return useQuery({
    queryKey: ["leads-enriched", sortDescending ? "desc" : "asc"],
    queryFn: async () => {
      // 1. Fetch all leads (paginated)
      const pageSize = 1000;
      const allLeads: Lead[] = [];
      for (let page = 0; ; page++) {
        const { data, error } = await supabase
          .from("leads")
          .select("*")
          .range(page * pageSize, (page + 1) * pageSize - 1);
        if (error) throw error;
        allLeads.push(...((data ?? []) as Lead[]));
        if ((data?.length ?? 0) < pageSize) break;
      }

      allLeads.sort((a, b) => {
        const nA = parseInt(a.customer_code.replace(/\D/g, "")) || 0;
        const nB = parseInt(b.customer_code.replace(/\D/g, "")) || 0;
        return sortDescending ? nB - nA : nA - nB;
      });

      const leadIds = allLeads.map((l) => l.id).filter(Boolean) as string[];
      const customerCodes = allLeads.map((l) => l.customer_code).filter(Boolean);

      // 2. Next pending follow-up per lead (earliest upcoming/today)
      const fuMap: Record<string, { date: string; time: string | null }> = {};
      if (leadIds.length > 0) {
        const { data: fus } = await supabase
          .from("follow_ups")
          .select("lead_id, scheduled_date, scheduled_time")
          .in("lead_id", leadIds)
          .eq("status", "Pending")
          .order("scheduled_date", { ascending: true });
        (fus || []).forEach((f: any) => {
          if (!fuMap[f.lead_id]) {
            fuMap[f.lead_id] = { date: f.scheduled_date, time: f.scheduled_time };
          }
        });
      }

      // 3. Last call log per lead (status + disposition)
      const callMap: Record<string, { status: string; disposition: string | null; date: string }> = {};
      if (leadIds.length > 0) {
        const { data: calls } = await supabase
          .from("call_logs")
          .select("lead_id, call_status, disposition, created_at")
          .in("lead_id", leadIds)
          .order("created_at", { ascending: false });
        (calls || []).forEach((c: any) => {
          if (!callMap[c.lead_id]) {
            callMap[c.lead_id] = {
              status: c.call_status,
              disposition: c.disposition || null,
              date: c.created_at,
            };
          }
        });
      }

      // 4. FY revenue per customer_code
      const now = new Date();
      const fyYear = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
      const fyStart = `${fyYear}-04-01`;
      const fyEnd = `${fyYear + 1}-04-01`;
      const revenueMap: Record<string, number> = {};
      if (customerCodes.length > 0) {
        const { data: sales } = await supabase
          .from("sales")
          .select("customer_code, total_amount")
          .in("customer_code", customerCodes)
          .gte("order_date", fyStart)
          .lt("order_date", fyEnd);
        (sales || []).forEach((s: any) => {
          if (!s.customer_code) return;
          revenueMap[s.customer_code] = (revenueMap[s.customer_code] || 0) + (s.total_amount || 0);
        });
      }

      return allLeads.map((lead): EnrichedLead => ({
        ...lead,
        next_followup: lead.id ? (fuMap[lead.id] ?? null) : null,
        last_call_status: lead.id ? (callMap[lead.id]?.status ?? null) : null,
        last_call_disposition: lead.id ? (callMap[lead.id]?.disposition ?? null) : null,
        last_call_date: lead.id ? (callMap[lead.id]?.date ?? null) : null,
        fy_revenue: revenueMap[lead.customer_code] ?? 0,
      }));
    },
    staleTime: 30000,
  });
};
