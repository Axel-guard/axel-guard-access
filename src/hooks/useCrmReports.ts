import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";

export type ReportPeriod = "today" | "yesterday" | "week" | "15days" | "month" | "custom";

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
