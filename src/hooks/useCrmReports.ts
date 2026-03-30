import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export type ReportPeriod = "today" | "yesterday" | "week" | "15days" | "month" | "custom" | "all";

export interface CrmReportFilters {
  period: ReportPeriod;
  customFrom?: string;  // yyyy-MM-dd
  customTo?: string;
  employeeFilter?: string; // "all" or name
}

export interface EmployeeReportRow {
  name: string;
  totalCalls: number;
  talkCalls: number;
  notTalkCalls: number;
  approaches: number;
  negotiates: number;
  orderDone: number;
  orderLost: number;
  stageChanges: number;
}

export interface CrmReportSummary {
  totalCalls: number;
  talkCalls: number;
  notTalkCalls: number;
  approaches: number;
  negotiates: number;
  orderDone: number;
  orderLost: number;
  stageChanges: number;
  byEmployee: EmployeeReportRow[];
  dateFrom: string;
  dateTo: string;
}

function getDateRange(filters: CrmReportFilters): { from: Date; to: Date } {
  const now = new Date();
  switch (filters.period) {
    case "today":
      return { from: startOfDay(now), to: endOfDay(now) };
    case "yesterday": {
      const y = subDays(now, 1);
      return { from: startOfDay(y), to: endOfDay(y) };
    }
    case "week":
      return { from: startOfWeek(now, { weekStartsOn: 1 }), to: endOfDay(now) };
    case "15days":
      return { from: startOfDay(subDays(now, 14)), to: endOfDay(now) };
    case "month":
      return { from: startOfMonth(now), to: endOfDay(now) };
    case "custom": {
      const from = filters.customFrom ? startOfDay(new Date(filters.customFrom)) : startOfDay(now);
      const to   = filters.customTo   ? endOfDay(new Date(filters.customTo))     : endOfDay(now);
      return { from, to };
    }
  }
}

export interface EmployeeAllStatsRow {
  name: string;
  leadsAssigned: number;
  suspect: number;
  prospect: number;
  approach: number;
  negotiate: number;
  orderDone: number;
  orderLost: number;
  totalCallsToday: number;
  talkCallsToday: number;
  notTalkCallsToday: number;
  openTickets: number;
}

export const useEmployeeAllStats = () => {
  return useQuery({
    queryKey: ["employee-all-stats"],
    queryFn: async (): Promise<EmployeeAllStatsRow[]> => {
      const todayStart = startOfDay(new Date()).toISOString();
      const todayEnd   = endOfDay(new Date()).toISOString();

      const [empsRes, leadsRes, callsRes, tasksRes] = await Promise.all([
        supabase.from("employees").select("name, email, user_id").eq("is_active", true),
        supabase.from("leads").select("assigned_to, pipeline_stage"),
        supabase.from("call_logs")
          .select("user_name, call_status")
          .gte("created_at", todayStart)
          .lte("created_at", todayEnd),
        supabase.from("tasks")
          .select("assigned_to")
          .eq("status", "WIP"),
      ]);

      const employees = empsRes.data ?? [];
      const leads     = leadsRes.data ?? [];
      const calls     = (callsRes.error ? [] : callsRes.data) ?? [];
      const tasks     = (tasksRes.error ? [] : tasksRes.data) ?? [];

      // Build email-prefix → canonical name map  (e.g. "sachin" → "Sachin Kumar")
      // call_logs.user_name stores email prefix (user?.email?.split("@")[0])
      const prefixToName: Record<string, string> = {};
      // Build user_id → canonical name map for tasks matching
      const userIdToName: Record<string, string> = {};
      for (const emp of employees) {
        const prefix = emp.email?.split("@")[0]?.toLowerCase();
        if (prefix && emp.name) prefixToName[prefix] = emp.name;
        if (emp.user_id && emp.name) userIdToName[emp.user_id] = emp.name;
      }

      // Canonical names from employees table (deduplicated)
      const seen = new Set<string>();
      const canonicalNames: string[] = [];
      for (const emp of employees) {
        const n = emp.name?.trim();
        if (n && !seen.has(n.toLowerCase())) {
          seen.add(n.toLowerCase());
          canonicalNames.push(n);
        }
      }

      // Also include any names that appear in leads/calls but not in employees table
      const extraNames = new Set<string>();
      leads.forEach(l => {
        const n = l.assigned_to?.trim();
        if (n && !seen.has(n.toLowerCase())) { seen.add(n.toLowerCase()); extraNames.add(n); }
      });
      calls.forEach(c => {
        const resolved = c.user_name ? (prefixToName[c.user_name.toLowerCase()] ?? c.user_name) : null;
        if (resolved && !seen.has(resolved.toLowerCase())) { seen.add(resolved.toLowerCase()); extraNames.add(resolved); }
      });
      const allNames = [...canonicalNames, ...Array.from(extraNames)];

      return allNames.map(name => {
        const nameLower = name.toLowerCase();
        // Match leads by assigned_to (full name, case-insensitive)
        const empLeads = leads.filter(l => l.assigned_to?.trim().toLowerCase() === nameLower);
        // Match calls by resolving email prefix → canonical name (today's calls only)
        const empCalls = calls.filter(c => {
          if (!c.user_name) return false;
          const resolved = prefixToName[c.user_name.toLowerCase()] ?? c.user_name;
          return resolved.toLowerCase() === nameLower;
        });
        // Match WIP tickets by assigned_to UUID → canonical name
        const empTickets = tasks.filter(t => {
          if (!t.assigned_to) return false;
          const resolved = userIdToName[t.assigned_to];
          return resolved?.toLowerCase() === nameLower;
        });
        return {
          name,
          leadsAssigned:     empLeads.length,
          suspect:           empLeads.filter(l => l.pipeline_stage === "Suspect").length,
          prospect:          empLeads.filter(l => l.pipeline_stage === "Prospect").length,
          approach:          empLeads.filter(l => l.pipeline_stage === "Approach").length,
          negotiate:         empLeads.filter(l => l.pipeline_stage === "Negotiate").length,
          orderDone:         empLeads.filter(l => l.pipeline_stage === "Order Done").length,
          orderLost:         empLeads.filter(l => l.pipeline_stage === "Order Lost").length,
          totalCallsToday:   empCalls.length,
          talkCallsToday:    empCalls.filter(c => c.call_status === "Connected").length,
          notTalkCallsToday: empCalls.filter(c => c.call_status !== "Connected").length,
          openTickets:       empTickets.length,
        };
      }).sort((a, b) => b.leadsAssigned - a.leadsAssigned);
    },
    staleTime: 60_000,
    refetchInterval: 120_000,
  });
};

export const useCrmReports = (filters: CrmReportFilters) => {
  return useQuery({
    queryKey: ["crm-reports", filters],
    queryFn: async (): Promise<CrmReportSummary> => {
      const { from, to } = getDateRange(filters);
      const fromISO = from.toISOString();
      const toISO   = to.toISOString();

      // Fetch call_logs in range
      const { data: callLogs, error: clErr } = await supabase
        .from("call_logs")
        .select("call_status, user_name, created_at")
        .gte("created_at", fromISO)
        .lte("created_at", toISO);
      if (clErr) throw clErr;

      // Fetch lead_stage_history in range
      const { data: stageHistory, error: shErr } = await supabase
        .from("lead_stage_history")
        .select("to_stage, changed_by, created_at")
        .gte("created_at", fromISO)
        .lte("created_at", toISO);
      if (shErr) throw shErr;

      const logs   = callLogs   ?? [];
      const stages = stageHistory ?? [];

      // Employee names from both sources
      const empNames = new Set<string>([
        ...logs.map((l) => l.user_name || "Unknown"),
        ...stages.map((s) => s.changed_by || "Unknown"),
      ]);

      const byEmployee: EmployeeReportRow[] = Array.from(empNames).map((name) => {
        const empLogs   = logs.filter((l) => (l.user_name || "Unknown") === name);
        const empStages = stages.filter((s) => (s.changed_by || "Unknown") === name);

        return {
          name,
          totalCalls:   empLogs.length,
          talkCalls:    empLogs.filter((l) => l.call_status === "Connected").length,
          notTalkCalls: empLogs.filter((l) => l.call_status !== "Connected").length,
          approaches:   empStages.filter((s) => s.to_stage === "Approach").length,
          negotiates:   empStages.filter((s) => s.to_stage === "Negotiate").length,
          orderDone:    empStages.filter((s) => s.to_stage === "Order Done").length,
          orderLost:    empStages.filter((s) => s.to_stage === "Order Lost").length,
          stageChanges: empStages.length,
        };
      }).sort((a, b) => b.totalCalls - a.totalCalls);

      const summary: CrmReportSummary = {
        totalCalls:   logs.length,
        talkCalls:    logs.filter((l) => l.call_status === "Connected").length,
        notTalkCalls: logs.filter((l) => l.call_status !== "Connected").length,
        approaches:   stages.filter((s) => s.to_stage === "Approach").length,
        negotiates:   stages.filter((s) => s.to_stage === "Negotiate").length,
        orderDone:    stages.filter((s) => s.to_stage === "Order Done").length,
        orderLost:    stages.filter((s) => s.to_stage === "Order Lost").length,
        stageChanges: stages.length,
        byEmployee,
        dateFrom: format(from, "dd MMM yyyy"),
        dateTo:   format(to,   "dd MMM yyyy"),
      };

      return summary;
    },
    staleTime: 60_000,
  });
};
