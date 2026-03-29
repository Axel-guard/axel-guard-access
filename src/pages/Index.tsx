import { useState } from "react";
import { Users, Calendar, AlertTriangle, PhoneCall, TrendingUp, ShoppingCart, Target, CheckCircle2, Phone, PhoneOff, MoreVertical, Clock, Building2 } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { useCrmKpis } from "@/hooks/useFollowUps";
import { useEmployeeCrmStats } from "@/hooks/useEmployeeCrmStats";
import { useRecentCallActivity, CallActivityItem } from "@/hooks/useRecentCallActivity";
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

const Index = () => {
  const navigate = useNavigate();
  const { isAdmin, isMasterAdmin } = useAuth();
  const { data: summary, isLoading: summaryLoading } = useDashboardSummary();
  const { data: crmKpis, isLoading: crmLoading } = useCrmKpis();
  const { data: empCrmStats = [], isLoading: empCrmLoading } = useEmployeeCrmStats();
  const { data: callActivity = [], isLoading: callActivityLoading } = useRecentCallActivity(50);
  const [detailCall, setDetailCall] = useState<CallActivityItem | null>(null);

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

      {/* ── Call Activity Feed ── */}
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

      {/* Employee CRM Performance — Admin only */}
      {(isAdmin || isMasterAdmin) && (
        <div className="rounded-xl border border-border bg-card shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Employee CRM Performance
            </h2>
            <button onClick={() => navigate("/sales-dashboard")} className="text-xs text-primary hover:underline">
              Sales Dashboard →
            </button>
          </div>

          {empCrmLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : empCrmStats.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No CRM activity recorded yet</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-2 text-xs font-semibold text-muted-foreground">Employee</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Leads</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Calls</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Follow-ups</th>
                    <th className="text-center py-2 text-xs font-semibold text-muted-foreground">Conversions</th>
                    <th className="text-right py-2 text-xs font-semibold text-muted-foreground">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {empCrmStats.map((emp) => (
                    <tr key={emp.name} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-2.5 font-medium">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                            {emp.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                          </div>
                          {emp.name}
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400">
                          {emp.leadsAssigned}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="font-semibold text-foreground">{emp.callsDone}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="font-semibold text-emerald-600">{emp.followUpsDone}</span>
                      </td>
                      <td className="py-2.5 text-center">
                        <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          {emp.conversions}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-right font-semibold text-foreground">
                        {emp.revenue > 0 ? formatCurrency(emp.revenue) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Index;
