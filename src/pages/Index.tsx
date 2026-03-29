import { Users, Calendar, AlertTriangle, PhoneCall, TrendingUp, ShoppingCart, Target, CheckCircle2 } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useSales";
import { useCrmKpis } from "@/hooks/useFollowUps";
import { useEmployeeCrmStats } from "@/hooks/useEmployeeCrmStats";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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
