import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeCrmStat {
  name: string;
  leadsAssigned: number;
  callsDone: number;
  followUpsDone: number;
  conversions: number;
  revenue: number;
}

export const useEmployeeCrmStats = () => {
  return useQuery({
    queryKey: ["employee-crm-stats"],
    queryFn: async () => {
      const [leadsRes, callsRes, fuRes, convRes, salesRes] = await Promise.all([
        // Leads assigned per employee
        supabase.from("leads").select("assigned_to"),
        // Calls done per employee (user_name)
        supabase.from("call_logs").select("user_name"),
        // Completed follow-ups per employee
        supabase.from("follow_ups").select("assigned_to").eq("status", "Completed"),
        // Order Done leads per employee
        supabase.from("leads").select("assigned_to").eq("pipeline_stage", "Order Done"),
        // Revenue per employee from sales
        supabase.from("sales").select("employee_name, total_amount"),
      ]);

      const empSet = new Set<string>();

      // Build per-employee counts
      const leadsMap: Record<string, number> = {};
      (leadsRes.data || []).forEach((r: any) => {
        const e = r.assigned_to?.trim();
        if (!e) return;
        empSet.add(e);
        leadsMap[e] = (leadsMap[e] || 0) + 1;
      });

      const callsMap: Record<string, number> = {};
      (callsRes.data || []).forEach((r: any) => {
        const e = r.user_name?.trim();
        if (!e) return;
        empSet.add(e);
        callsMap[e] = (callsMap[e] || 0) + 1;
      });

      const fuMap: Record<string, number> = {};
      (fuRes.data || []).forEach((r: any) => {
        const e = r.assigned_to?.trim();
        if (!e) return;
        empSet.add(e);
        fuMap[e] = (fuMap[e] || 0) + 1;
      });

      const convMap: Record<string, number> = {};
      (convRes.data || []).forEach((r: any) => {
        const e = r.assigned_to?.trim();
        if (!e) return;
        empSet.add(e);
        convMap[e] = (convMap[e] || 0) + 1;
      });

      const revenueMap: Record<string, number> = {};
      (salesRes.data || []).forEach((r: any) => {
        const e = r.employee_name?.trim();
        if (!e || e.toLowerCase() === "imported") return;
        empSet.add(e);
        revenueMap[e] = (revenueMap[e] || 0) + (r.total_amount || 0);
      });

      const stats: EmployeeCrmStat[] = Array.from(empSet).map((name) => ({
        name,
        leadsAssigned: leadsMap[name] || 0,
        callsDone: callsMap[name] || 0,
        followUpsDone: fuMap[name] || 0,
        conversions: convMap[name] || 0,
        revenue: revenueMap[name] || 0,
      }));

      // Sort by calls done desc
      return stats.sort((a, b) => b.callsDone - a.callsDone);
    },
    staleTime: 60000,
    refetchInterval: 120000,
  });
};
