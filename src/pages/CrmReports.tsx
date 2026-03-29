import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCrmReports, CrmReportFilters, ReportPeriod } from "@/hooks/useCrmReports";
import { useAuth } from "@/contexts/AuthContext";
import {
  Phone, PhoneOff, PhoneCall, TrendingUp, Target, XCircle,
  Users, BarChart3, Calendar, ChevronRight, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── Period selector ─────────────────────────────────────────── */
const PERIODS: { key: ReportPeriod; label: string }[] = [
  { key: "today",     label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "week",      label: "This Week" },
  { key: "15days",    label: "15 Days" },
  { key: "month",     label: "This Month" },
  { key: "custom",    label: "Custom" },
];

/* ── KPI card ────────────────────────────────────────────────── */
interface KpiCardProps {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;     // tailwind bg classes
  textColor: string;
  sub?: string;
}
const KpiCard = ({ label, value, icon: Icon, color, textColor, sub }: KpiCardProps) => (
  <div className={cn("rounded-xl p-4 border", color)}>
    <div className="flex items-center justify-between mb-3">
      <p className={cn("text-xs font-semibold uppercase tracking-wide", textColor)}>{label}</p>
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center bg-white/40")}>
        <Icon className={cn("h-4 w-4", textColor)} />
      </div>
    </div>
    <p className={cn("text-3xl font-bold tabular-nums", textColor)}>{value}</p>
    {sub && <p className={cn("text-xs mt-1 opacity-70", textColor)}>{sub}</p>}
  </div>
);

/* ── Stage badge ─────────────────────────────────────────────── */
const StagePill = ({ stage, count }: { stage: string; count: number }) => {
  const cls: Record<string, string> = {
    "Approach":   "bg-yellow-100 text-yellow-700 border-yellow-200",
    "Negotiate":  "bg-orange-100 text-orange-700 border-orange-200",
    "Order Done": "bg-emerald-100 text-emerald-700 border-emerald-200",
    "Order Lost": "bg-rose-100 text-rose-700 border-rose-200",
  };
  return (
    <div className={cn("rounded-xl border p-4", cls[stage] ?? "bg-muted/50 border-border")}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">{stage}</p>
      <p className="text-3xl font-bold mt-2 tabular-nums">{count}</p>
      <p className="text-xs mt-1 opacity-60">stage movements</p>
    </div>
  );
};

/* ── Main page ───────────────────────────────────────────────── */
const CrmReportsPage = () => {
  const { isMasterAdmin, isAdmin } = useAuth();
  const [period, setPeriod]         = useState<ReportPeriod>("today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo]     = useState("");

  const filters: CrmReportFilters = { period, customFrom, customTo };
  const { data, isLoading } = useCrmReports(filters);

  // Always use a zero-filled object so cards are always rendered
  const d = data ?? {
    totalCalls: 0, talkCalls: 0, notTalkCalls: 0,
    approaches: 0, negotiates: 0, orderDone: 0, orderLost: 0,
    stageChanges: 0, byEmployee: [], dateFrom: "—", dateTo: "—",
  };
  const talkPct = d.totalCalls > 0 ? Math.round((d.talkCalls / d.totalCalls) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">CRM Reports</h1>
        <p className="text-sm text-muted-foreground">
          Call activity &amp; pipeline stage movement analytics
          {data && (
            <span className="ml-2 text-xs text-primary font-medium">
              · {data.dateFrom}{data.dateFrom !== data.dateTo ? ` – ${data.dateTo}` : ""}
            </span>
          )}
        </p>
      </div>

      {/* Period selector */}
      <Card className="shadow-sm">
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2 items-center">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriod(p.key)}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs font-medium border transition-all",
                  period === p.key
                    ? "bg-primary text-primary-foreground border-primary shadow-sm"
                    : "bg-transparent border-border text-muted-foreground hover:border-primary/40 hover:text-primary"
                )}
              >
                {p.label}
              </button>
            ))}

            {/* Custom range inputs */}
            {period === "custom" && (
              <div className="flex items-center gap-2 ml-2">
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                />
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="date"
                  className="h-8 text-xs w-36"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                />
              </div>
            )}

            {isLoading && <Loader2 className="h-4 w-4 animate-spin text-primary ml-auto" />}
          </div>
        </CardContent>
      </Card>

      {/* ── Call KPIs ── always visible, skeletons while loading ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Phone className="h-4 w-4" /> Call Summary
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <KpiCard
              label="Total Calls"
              value={d.totalCalls}
              icon={PhoneCall}
              color="bg-blue-50 border-blue-200"
              textColor="text-blue-700"
              sub="all call attempts"
            />
            <KpiCard
              label="Talk Calls (Connected)"
              value={d.talkCalls}
              icon={Phone}
              color="bg-emerald-50 border-emerald-200"
              textColor="text-emerald-700"
              sub={`${talkPct}% connect rate`}
            />
            <KpiCard
              label="Not Talk Calls"
              value={d.notTalkCalls}
              icon={PhoneOff}
              color="bg-red-50 border-red-200"
              textColor="text-red-700"
              sub={`${100 - talkPct}% of total`}
            />
          </div>
        )}
      </div>

      {/* ── Stage Movements ── always visible ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" /> Stage Movements
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StagePill stage="Approach"   count={d.approaches} />
            <StagePill stage="Negotiate"  count={d.negotiates} />
            <StagePill stage="Order Done" count={d.orderDone}  />
            <StagePill stage="Order Lost" count={d.orderLost}  />
          </div>
        )}
      </div>

      {/* ── Employee table ── always visible, empty rows when no data ── */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-2">
          <Users className="h-4 w-4" />
          {(isMasterAdmin || isAdmin) ? "Employee-wise Breakdown" : "My Activity"}
        </h2>
        <Card className="shadow-sm">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs font-semibold">Employee</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Total Calls</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-emerald-700">Talk</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-red-600">Not Talk</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-yellow-700">Approach</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-orange-700">Negotiate</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-emerald-700">Order Done</TableHead>
                      <TableHead className="text-right text-xs font-semibold text-rose-700">Order Lost</TableHead>
                      <TableHead className="text-right text-xs font-semibold">Stage Changes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {d.byEmployee.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                          No call activity recorded for this period
                        </TableCell>
                      </TableRow>
                    ) : (
                      <>
                        {d.byEmployee.map((emp) => (
                          <TableRow key={emp.name} className="hover:bg-muted/30">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                                  {emp.name.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium">{emp.name}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right font-semibold tabular-nums">{emp.totalCalls}</TableCell>
                            <TableCell className="text-right text-emerald-600 font-medium tabular-nums">{emp.talkCalls}</TableCell>
                            <TableCell className="text-right text-red-600 tabular-nums">{emp.notTalkCalls}</TableCell>
                            <TableCell className="text-right text-yellow-700 tabular-nums">{emp.approaches}</TableCell>
                            <TableCell className="text-right text-orange-700 tabular-nums">{emp.negotiates}</TableCell>
                            <TableCell className="text-right text-emerald-700 font-medium tabular-nums">{emp.orderDone}</TableCell>
                            <TableCell className="text-right text-rose-600 tabular-nums">{emp.orderLost}</TableCell>
                            <TableCell className="text-right tabular-nums">{emp.stageChanges}</TableCell>
                          </TableRow>
                        ))}
                        {d.byEmployee.length > 1 && (
                          <TableRow className="bg-muted/60 font-semibold border-t-2 border-border">
                            <TableCell className="text-xs font-bold text-muted-foreground uppercase">Total</TableCell>
                            <TableCell className="text-right tabular-nums">{d.totalCalls}</TableCell>
                            <TableCell className="text-right text-emerald-600 tabular-nums">{d.talkCalls}</TableCell>
                            <TableCell className="text-right text-red-600 tabular-nums">{d.notTalkCalls}</TableCell>
                            <TableCell className="text-right text-yellow-700 tabular-nums">{d.approaches}</TableCell>
                            <TableCell className="text-right text-orange-700 tabular-nums">{d.negotiates}</TableCell>
                            <TableCell className="text-right text-emerald-700 tabular-nums">{d.orderDone}</TableCell>
                            <TableCell className="text-right text-rose-600 tabular-nums">{d.orderLost}</TableCell>
                            <TableCell className="text-right tabular-nums">{d.stageChanges}</TableCell>
                          </TableRow>
                        )}
                      </>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CrmReportsPage;
