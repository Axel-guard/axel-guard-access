import { useState } from "react";
import { Users, Calendar, AlertTriangle, PhoneCall, TrendingUp, ShoppingCart, Target, Phone, PhoneOff, MoreVertical, Clock, BarChart3 } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { useCrmKpis } from "@/hooks/useFollowUps";

import { useRecentCallActivity, CallActivityItem } from "@/hooks/useRecentCallActivity";
import { useCrmReports, useEmployeeAllStats, ReportPeriod, EmployeeAllStatsRow } from "@/hooks/useCrmReports";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

/* ── Call status helpers ─────────────────────────────────────── */
const callStatusColor = (s: string) => {
  switch (s) {
    case "Connected":     return "bg-emerald-100 text-emerald-700 border-0";
    case "Not Connected": return "bg-red-100 text-red-700 border-0";
    case "Busy":          return "bg-amber-100 text-amber-700 border-0";
    case "Switched Off":  return "bg-slate-100 text-slate-600 border-0";
    default:              return "bg-muted text-muted-foreground border-0";
  }
};
const dispositionColor = (d?: string | null) => {
  switch (d) {
    case "Interested":       return "bg-emerald-100 text-emerald-700 border-0";
    case "Converted":        return "bg-blue-100 text-blue-700 border-0";
    case "Not Interested":   return "bg-red-100 text-red-700 border-0";
    case "Call Back Later":  return "bg-amber-100 text-amber-700 border-0";
    case "Wrong Number":     return "bg-slate-100 text-slate-600 border-0";
    default:                 return "bg-muted text-muted-foreground border-0";
  }
};
const stageColor = (s?: string) => {
  switch (s) {
    case "Suspect":    return "bg-slate-100 text-slate-700 border-0";
    case "Prospect":   return "bg-blue-100 text-blue-700 border-0";
    case "Approach":   return "bg-yellow-100 text-yellow-700 border-0";
    case "Negotiate":  return "bg-orange-100 text-orange-700 border-0";
    case "Order Done": return "bg-emerald-100 text-emerald-700 border-0";
    case "Order Lost": return "bg-rose-100 text-rose-700 border-0";
    default:           return "bg-muted text-muted-foreground border-0";
  }
};
const fmtTime = (iso: string) => {
  try { return format(new Date(iso), "dd MMM, h:mm a"); } catch { return iso; }
};
const today = format(new Date(), "yyyy-MM-dd");
const fmtTbro = (fu?: { date: string; time?: string } | null) => {
  if (!fu) return null;
  const isOverdue = fu.date < today;
  const isToday   = fu.date === today;
  const label = isOverdue ? "Overdue" : isToday ? "Today" : format(new Date(fu.date + "T00:00:00"), "dd MMM");
  const timeStr = fu.time ? " · " + fu.time.slice(0, 5) : "";
  return { label: label + timeStr, overdue: isOverdue, isToday };
};

/* ── Call Detail Dialog ──────────────────────────────────────── */
const CallDetailDialog = ({ call, open, onClose }: { call: CallActivityItem | null; open: boolean; onClose: () => void }) => (
  <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
    <DialogContent className="max-w-sm">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2 text-base">
          <Phone className="h-4 w-4 text-primary" />
          Call Details
        </DialogTitle>
      </DialogHeader>
      {call && (
        <div className="space-y-3 text-sm">
          <div className="rounded-lg bg-muted/40 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Call Status</span>
              <Badge className={callStatusColor(call.call_status)}>{call.call_status}</Badge>
            </div>
            {call.disposition && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Disposition</span>
                <Badge className={dispositionColor(call.disposition)}>{call.disposition}</Badge>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Call Type</span>
              <span className="font-medium">{call.call_type || "Outgoing"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Called By</span>
              <span className="font-medium">{call.user_name || "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Time</span>
              <span className="font-medium">{fmtTime(call.created_at)}</span>
            </div>
          </div>
          {call.notes && (
            <div>
              <p className="text-xs text-muted-foreground mb-1">Remarks</p>
              <p className="text-sm bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">{call.notes}</p>
            </div>
          )}
          {call.next_followup && (() => {
            const tbro = fmtTbro(call.next_followup);
            return tbro ? (
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <span className="text-xs text-muted-foreground">Next TBRO</span>
                <span className={cn("text-xs font-semibold", tbro.overdue ? "text-red-600" : tbro.isToday ? "text-amber-600" : "text-foreground")}>
                  {tbro.label}
                </span>
              </div>
            ) : null;
          })()}
        </div>
      )}
    </DialogContent>
  </Dialog>
);

const STAGE_COLORS: Record<string, string> = {
  "Suspect":    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  "Prospect":   "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  "Approach":   "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Negotiate":  "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  "Order Done": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
};

const STAGE_BAR_COLORS: Record<string, string> = {
  "Suspect":    "bg-slate-400",
  "Prospect":   "bg-blue-500",
  "Approach":   "bg-yellow-500",
  "Negotiate":  "bg-orange-500",
  "Order Done": "bg-emerald-500",
};

const PIPELINE_ORDER = ["Suspect", "Prospect", "Approach", "Negotiate", "Order Done"];

interface CrmKpiCardProps {
  title: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  onClick?: () => void;
  subtitle?: string;
}

const CrmKpiCard = ({ title, value, icon: Icon, color, bgColor, onClick, subtitle }: CrmKpiCardProps) => (
  <div
    className={cn(
      "rounded-xl border border-border bg-card p-4 shadow-sm",
      onClick && "cursor-pointer hover:shadow-md transition-shadow"
    )}
    onClick={onClick}
  >
    <div className="flex items-start justify-between">
      <div className="flex-1">
        <p className="text-xs font-medium text-muted-foreground mb-1">{title}</p>
        <p className={cn("text-2xl font-bold", color)}>{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", bgColor)}>
        <Icon className={cn("h-5 w-5", color)} />
      </div>
    </div>
  </div>
);

const CRM_PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "all",       label: "All" },
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week",      label: "This Week" },
  { key: "15days",    label: "15 Days" },
  { key: "month",     label: "This Month" },
];

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, isMasterAdmin, user } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: crmKpis, isLoading: crmLoading } = useCrmKpis();

  const { data: callActivity = [], isLoading: callActivityLoading } = useRecentCallActivity(50);
  const [detailCall, setDetailCall] = useState<CallActivityItem | null>(null);
  const [crmPeriod, setCrmPeriod] = useState<ReportPeriod>("all");

  // Current user's name (matches user_name stored in call_logs / changed_by in lead_stage_history)
  const myName = user?.email?.split("@")[0] || "";

  const { data: crmReport, isLoading: crmReportLoading } = useCrmReports({
    period: crmPeriod === "all" ? "today" : crmPeriod, // "all" uses its own hook; pass a dummy to avoid errors
  });
  const { data: allStats = [], isLoading: allStatsLoading } = useEmployeeAllStats();

  const isLoading = summaryLoading || crmLoading;

  const conversionRate = crmKpis
    ? crmKpis.totalLeads > 0
      ? ((crmKpis.stageCounts["Order Done"] || 0) / crmKpis.totalLeads * 100).toFixed(1)
      : "0.0"
    : "—";

  const totalStageCount = crmKpis
    ? Object.values(crmKpis.stageCounts).reduce((s, v) => s + v, 0)
    : 0;

  const formatCurrency = (value: number) => {
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString()}`;
  };

  const currentMonthName = new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-40 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">{currentMonthName} · CRM Overview</p>
      </div>

      {/* Top CRM KPI Cards */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        <CrmKpiCard
          title="Total Leads"
          value={crmKpis?.totalLeads ?? "—"}
          icon={Users}
          color="text-blue-600"
          bgColor="bg-blue-100 dark:bg-blue-900/30"
          onClick={() => navigate("/leads")}
          subtitle="All pipeline leads"
        />
        <CrmKpiCard
          title="New Today"
          value={crmKpis?.newLeadsToday ?? "—"}
          icon={TrendingUp}
          color="text-emerald-600"
          bgColor="bg-emerald-100 dark:bg-emerald-900/30"
          onClick={() => navigate("/leads")}
          subtitle="Added today"
        />
        <CrmKpiCard
          title="Follow-ups Today"
          value={crmKpis?.followUpsToday ?? "—"}
          icon={Calendar}
          color="text-amber-600"
          bgColor="bg-amber-100 dark:bg-amber-900/30"
          onClick={() => navigate("/follow-ups")}
          subtitle="Scheduled for today"
        />
        <CrmKpiCard
          title="Missed Follow-ups"
          value={crmKpis?.missedFollowUps ?? "—"}
          icon={AlertTriangle}
          color="text-red-600"
          bgColor="bg-red-100 dark:bg-red-900/30"
          onClick={() => navigate("/follow-ups")}
          subtitle="Needs attention"
        />
        <CrmKpiCard
          title="Conversion Rate"
          value={`${conversionRate}%`}
          icon={Target}
          color="text-violet-600"
          bgColor="bg-violet-100 dark:bg-violet-900/30"
          subtitle={`${crmKpis?.stageCounts["Order Done"] ?? 0} converted`}
        />
        <CrmKpiCard
          title="Total Sales"
          value={String(summary?.totalSales || 0)}
          icon={ShoppingCart}
          color="text-primary"
          bgColor="bg-primary/10"
          onClick={() => navigate("/sales-dashboard")}
          subtitle={formatCurrency(summary?.totalRevenue || 0)}
        />
      </div>

      {/* Pipeline Overview */}
      {crmKpis && totalStageCount > 0 && (
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <PhoneCall className="h-4 w-4 text-primary" />
              Pipeline Overview
            </h2>
            <button onClick={() => navigate("/leads")} className="text-xs text-primary hover:underline">
              View Leads →
            </button>
          </div>

          {/* Stage bars */}
          <div className="space-y-2">
            {PIPELINE_ORDER.map((stage) => {
              const count = crmKpis.stageCounts[stage] || 0;
              const pct = totalStageCount > 0 ? (count / totalStageCount) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-3">
                  <span className="w-24 text-xs text-muted-foreground shrink-0">{stage}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all", STAGE_BAR_COLORS[stage])}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-8 text-xs font-semibold text-right shrink-0">{count}</span>
                </div>
              );
            })}
          </div>

          {/* Stage pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {Object.entries(crmKpis.stageCounts).map(([stage, count]) => (
              <span
                key={stage}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium cursor-pointer ${STAGE_COLORS[stage] || "bg-muted text-muted-foreground"}`}
                onClick={() => navigate(`/leads`)}
              >
                {stage}: <strong>{count as number}</strong>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Employee CRM Report (2nd) ── visible to all ── */}
      {(() => {
        const isAllPeriod = crmPeriod === "all";
        const loading = isAllPeriod ? allStatsLoading : crmReportLoading;

        // For "All": use allStats; for time periods: use crmReport.byEmployee
        const rows: (EmployeeAllStatsRow | { name: string; totalCalls: number; talkCalls: number; notTalkCalls: number; approaches: number; negotiates: number; orderDone: number; orderLost: number; stageChanges: number })[] = isAllPeriod
          ? ((isAdmin || isMasterAdmin) ? allStats : allStats.filter(e => e.name === myName))
          : ((isAdmin || isMasterAdmin)
              ? (crmReport?.byEmployee ?? [])
              : (crmReport?.byEmployee ?? []).filter(e => e.name === myName));

        return (
          <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                {(isAdmin || isMasterAdmin) ? "Employee CRM Report" : "My CRM Report"}
              </h2>
              <button onClick={() => navigate("/crm-reports")} className="text-xs text-primary hover:underline">
                Full Reports →
              </button>
            </div>

            {/* Period pills */}
            <div className="flex flex-wrap gap-2">
              {CRM_PERIODS.map((p) => (
                <button
                  key={p.key}
                  onClick={() => setCrmPeriod(p.key)}
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-medium border transition-all",
                    crmPeriod === p.key
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-transparent border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                  )}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[1,2,3].map(i => <Skeleton key={i} className="h-56 rounded-xl" />)}
              </div>
            ) : rows.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {isAllPeriod ? "No leads assigned yet" : "No call activity for this period"}
              </p>
            ) : isAllPeriod ? (
              /* ── ALL view: comprehensive stats ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(rows as EmployeeAllStatsRow[]).map((emp) => {
                  const pct = emp.totalCallsMonth > 0 ? Math.round((emp.talkCallsMonth / emp.totalCallsMonth) * 100) : 0;
                  const isMe = emp.name === myName;
                  return (
                    <div key={emp.name} className={cn(
                      "rounded-xl border p-4 space-y-3",
                      isMe && !(isAdmin || isMasterAdmin) ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                    )}>
                      {/* Name row */}
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-foreground truncate">{emp.name}</span>
                        {isMe && <span className="ml-auto text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">You</span>}
                      </div>

                      {/* Leads assigned */}
                      <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2 flex items-center justify-between">
                        <span className="text-xs text-blue-700 font-medium">Leads Assigned</span>
                        <span className="text-base font-bold text-blue-700 tabular-nums">{emp.leadsAssigned}</span>
                      </div>

                      {/* Pipeline stage breakdown */}
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Pipeline Stages</p>
                        <div className="grid grid-cols-3 gap-1">
                          {[
                            { label: "Suspect",   value: emp.suspect,   cls: "bg-slate-50 border-slate-200 text-slate-700" },
                            { label: "Prospect",  value: emp.prospect,  cls: "bg-blue-50 border-blue-100 text-blue-700" },
                            { label: "Approach",  value: emp.approach,  cls: "bg-yellow-50 border-yellow-100 text-yellow-700" },
                            { label: "Negotiate", value: emp.negotiate, cls: "bg-orange-50 border-orange-100 text-orange-700" },
                            { label: "Order Done",value: emp.orderDone, cls: "bg-emerald-50 border-emerald-100 text-emerald-700" },
                            { label: "Order Lost",value: emp.orderLost, cls: "bg-rose-50 border-rose-100 text-rose-700" },
                          ].map(({ label, value, cls }) => (
                            <div key={label} className={cn("rounded-lg border px-1.5 py-1.5 text-center", cls)}>
                              <p className="text-[9px] font-medium leading-tight">{label}</p>
                              <p className="text-sm font-bold tabular-nums mt-0.5">{value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Current month calls */}
                      <div className="border-t border-border/60 pt-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold mb-1.5">Calls This Month</p>
                        <div className="grid grid-cols-3 gap-1.5 text-center">
                          <div className="rounded-lg bg-blue-50 border border-blue-100 py-1.5">
                            <p className="text-[10px] text-blue-600 font-medium">Total</p>
                            <p className="text-base font-bold text-blue-700 tabular-nums">{emp.totalCallsMonth}</p>
                          </div>
                          <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-1.5">
                            <p className="text-[10px] text-emerald-600 font-medium">Talk</p>
                            <p className="text-base font-bold text-emerald-700 tabular-nums">{emp.talkCallsMonth}</p>
                          </div>
                          <div className="rounded-lg bg-red-50 border border-red-100 py-1.5">
                            <p className="text-[10px] text-red-600 font-medium">Not Talk</p>
                            <p className="text-base font-bold text-red-700 tabular-nums">{emp.notTalkCallsMonth}</p>
                          </div>
                        </div>
                        {emp.totalCallsMonth > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                              <span>Connect rate</span>
                              <span className="font-semibold">{pct}%</span>
                            </div>
                            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                              <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── Time-period view: call + stage movement cards ── */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {(rows as typeof crmReport.byEmployee).map((emp) => {
                  const pct = emp.totalCalls > 0 ? Math.round((emp.talkCalls / emp.totalCalls) * 100) : 0;
                  const isMe = emp.name === myName;
                  return (
                    <div key={emp.name} className={cn(
                      "rounded-xl border p-4 space-y-3",
                      isMe && !(isAdmin || isMasterAdmin) ? "border-primary/40 bg-primary/5" : "border-border bg-card"
                    )}>
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                          {emp.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-sm text-foreground truncate">{emp.name}</span>
                        {isMe && <span className="ml-auto text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5 font-medium">You</span>}
                      </div>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        <div className="rounded-lg bg-blue-50 border border-blue-100 py-2">
                          <p className="text-[10px] text-blue-600 font-medium">Total</p>
                          <p className="text-lg font-bold text-blue-700 tabular-nums">{emp.totalCalls}</p>
                        </div>
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 py-2">
                          <p className="text-[10px] text-emerald-600 font-medium">Talk</p>
                          <p className="text-lg font-bold text-emerald-700 tabular-nums">{emp.talkCalls}</p>
                        </div>
                        <div className="rounded-lg bg-red-50 border border-red-100 py-2">
                          <p className="text-[10px] text-red-600 font-medium">Not Talk</p>
                          <p className="text-lg font-bold text-red-700 tabular-nums">{emp.notTalkCalls}</p>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                          <span>Connect rate</span><span className="font-semibold">{pct}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/60">
                        <div className="rounded-lg bg-yellow-50 border border-yellow-100 px-2 py-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-yellow-700 font-medium">Approach</span>
                          <span className="text-sm font-bold text-yellow-700 tabular-nums">{emp.approaches}</span>
                        </div>
                        <div className="rounded-lg bg-orange-50 border border-orange-100 px-2 py-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-orange-700 font-medium">Negotiate</span>
                          <span className="text-sm font-bold text-orange-700 tabular-nums">{emp.negotiates}</span>
                        </div>
                        <div className="rounded-lg bg-emerald-50 border border-emerald-100 px-2 py-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-emerald-700 font-medium">Order Done</span>
                          <span className="text-sm font-bold text-emerald-700 tabular-nums">{emp.orderDone}</span>
                        </div>
                        <div className="rounded-lg bg-rose-50 border border-rose-100 px-2 py-1.5 flex items-center justify-between">
                          <span className="text-[10px] text-rose-700 font-medium">Order Lost</span>
                          <span className="text-sm font-bold text-rose-700 tabular-nums">{emp.orderLost}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Call Activity Feed (3rd) ── */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Call Activity
            {callActivity.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({callActivity.length} recent)</span>
            )}
          </h2>
          <button onClick={() => navigate("/crm-reports")} className="text-xs text-primary hover:underline">
            CRM Reports →
          </button>
        </div>

        {callActivityLoading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4].map((i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
          </div>
        ) : callActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Phone className="h-8 w-8 text-muted-foreground/30 mb-2" />
            <p className="text-sm text-muted-foreground">No calls logged yet</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Call logs will appear here once the CRM tables are set up</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b border-border">
                <tr>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Customer</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Company</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Mobile</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call Time</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Stage</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Remarks</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Next TBRO</th>
                  <th className="w-9 px-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {callActivity.map((call) => {
                  const tbro = fmtTbro(call.next_followup);
                  return (
                    <tr key={call.id} className="hover:bg-muted/30 transition-colors group">
                      {/* Customer */}
                      <td className="px-3 py-2.5 min-w-[130px]">
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center shrink-0",
                            call.call_status === "Connected" ? "bg-emerald-100" : "bg-red-100"
                          )}>
                            {call.call_status === "Connected"
                              ? <Phone className="h-3 w-3 text-emerald-600" />
                              : <PhoneOff className="h-3 w-3 text-red-500" />}
                          </div>
                          <div>
                            <p className="font-medium text-foreground leading-tight text-xs">
                              {call.customer_name || "—"}
                            </p>
                            {call.customer_code && (
                              <p className="text-[10px] text-muted-foreground font-mono leading-tight">
                                {call.customer_code}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      {/* Company */}
                      <td className="px-3 py-2.5 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{call.company_name || "—"}</span>
                      </td>
                      {/* Mobile */}
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        <span className="text-xs font-mono">{call.mobile_number || "—"}</span>
                      </td>
                      {/* Call Time */}
                      <td className="px-3 py-2.5">
                        <div>
                          <span className="text-xs">{fmtTime(call.created_at)}</span>
                          {call.user_name && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">by {call.user_name}</p>
                          )}
                        </div>
                      </td>
                      {/* Stage */}
                      <td className="px-3 py-2.5 hidden sm:table-cell">
                        {call.pipeline_stage ? (
                          <Badge className={cn("text-[10px] px-2 py-0", stageColor(call.pipeline_stage))}>
                            {call.pipeline_stage}
                          </Badge>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* Remarks */}
                      <td className="px-3 py-2.5 hidden lg:table-cell max-w-[180px]">
                        <p className="text-xs text-muted-foreground truncate">{call.notes || "—"}</p>
                      </td>
                      {/* Next TBRO */}
                      <td className="px-3 py-2.5 hidden lg:table-cell">
                        {tbro ? (
                          <span className={cn("text-xs font-medium flex items-center gap-1",
                            tbro.overdue ? "text-red-600" : tbro.isToday ? "text-amber-600" : "text-foreground"
                          )}>
                            <Clock className="h-3 w-3 shrink-0" />{tbro.label}
                          </span>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                      {/* 3-dot */}
                      <td className="px-2 py-2.5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="h-7 w-7 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-muted">
                              <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setDetailCall(call)}>
                              <Phone className="mr-2 h-3.5 w-3.5 text-primary" />
                              View Full Details
                            </DropdownMenuItem>
                            {call.lead_id && (
                              <DropdownMenuItem onClick={() => navigate("/customer-details", { state: { preloadCode: call.customer_code } })}>
                                <Users className="mr-2 h-3.5 w-3.5" />
                                Customer Profile
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Call Detail Dialog ── */}
      <CallDetailDialog call={detailCall} open={!!detailCall} onClose={() => setDetailCall(null)} />
    </div>
  );
};

export default Index;
