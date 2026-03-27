import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { usePendency } from "@/hooks/usePendency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Truck, MapPin, ClipboardCheck, AlertCircle,
  RefreshCw, Search, Activity, TrendingDown, ExternalLink,
  FileText, Check, X, Eye,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
type Category = "balancePayment" | "dispatchPending" | "trackingPending" | "qcPending" | "pendingTickets" | "quotationApproval";

const categoryConfig: Record<Category, {
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  gradient: string;
  iconBg: string;
  textColor: string;
  ringColor: string;
}> = {
  balancePayment: {
    title: "Balance Payment",
    shortTitle: "Balance",
    icon: CreditCard,
    gradient: "from-amber-500 to-orange-500",
    iconBg: "bg-amber-500/10",
    textColor: "text-amber-600 dark:text-amber-400",
    ringColor: "ring-amber-500/30",
  },
  dispatchPending: {
    title: "Dispatch Pending",
    shortTitle: "Dispatch",
    icon: Truck,
    gradient: "from-blue-500 to-indigo-500",
    iconBg: "bg-blue-500/10",
    textColor: "text-blue-600 dark:text-blue-400",
    ringColor: "ring-blue-500/30",
  },
  trackingPending: {
    title: "Tracking Pending",
    shortTitle: "Tracking",
    icon: MapPin,
    gradient: "from-violet-500 to-purple-500",
    iconBg: "bg-violet-500/10",
    textColor: "text-violet-600 dark:text-violet-400",
    ringColor: "ring-violet-500/30",
  },
  qcPending: {
    title: "QC Pending",
    shortTitle: "QC",
    icon: ClipboardCheck,
    gradient: "from-emerald-500 to-teal-500",
    iconBg: "bg-emerald-500/10",
    textColor: "text-emerald-600 dark:text-emerald-400",
    ringColor: "ring-emerald-500/30",
  },
  pendingTickets: {
    title: "Pending Tickets",
    shortTitle: "Tickets",
    icon: AlertCircle,
    gradient: "from-rose-500 to-pink-500",
    iconBg: "bg-rose-500/10",
    textColor: "text-rose-600 dark:text-rose-400",
    ringColor: "ring-rose-500/30",
  },
  quotationApproval: {
    title: "Quotation Approval",
    shortTitle: "Quotations",
    icon: FileText,
    gradient: "from-cyan-500 to-sky-500",
    iconBg: "bg-cyan-500/10",
    textColor: "text-cyan-600 dark:text-cyan-400",
    ringColor: "ring-cyan-500/30",
  },
};

const cats: Category[] = ["balancePayment", "dispatchPending", "trackingPending", "qcPending", "pendingTickets", "quotationApproval"];

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
};
const fmtCurrency = (v: number | null) => v == null ? "₹0" : `₹${Number(v).toLocaleString("en-IN")}`;

const PendencyPage = () => {
  const { counts, records, isLoading } = usePendency();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Category>("balancePayment");
  const [search, setSearch] = useState("");

  // Realtime subscriptions
  useEffect(() => {
    const channel = supabase
      .channel("pendency-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-dispatch-sales"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shipments" }, () => {
        queryClient.invalidateQueries({ queryKey: ["shipments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "inventory" }, () => {
        queryClient.invalidateQueries({ queryKey: ["dispatch-inventory-status"] });
        queryClient.invalidateQueries({ queryKey: ["pendency-qc-records"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        queryClient.invalidateQueries({ queryKey: ["pendency-ticket-records"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "quotations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["pendency-quotation-approval"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payment_history" }, () => {
        queryClient.invalidateQueries({ queryKey: ["all-dispatch-sales"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["all-dispatch-sales"] });
    queryClient.invalidateQueries({ queryKey: ["shipments"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch-sale-items"] });
    queryClient.invalidateQueries({ queryKey: ["dispatch-inventory-status"] });
    queryClient.invalidateQueries({ queryKey: ["pendency-qc-records"] });
    queryClient.invalidateQueries({ queryKey: ["pendency-ticket-records"] });
  };

  const totalPending = counts ? cats.reduce((sum, c) => sum + counts[c], 0) : 0;

  // Filtered rows for active tab
  const filteredRows = useMemo(() => {
    const raw = records?.[activeTab] || [];
    if (!search) return raw;
    const q = search.toLowerCase();
    return raw.filter((r: any) =>
      Object.values(r).some(v => String(v || "").toLowerCase().includes(q))
    );
  }, [records, activeTab, search]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 rounded-2xl" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  const activeCfg = categoryConfig[activeTab];

  return (
    <div className="space-y-5">
      {/* ── Hero Header ── */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/8 via-background to-accent/5 border border-border/50 p-5 sm:p-6">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-primary/5 to-transparent rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/20">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight">Pendency Control Center</h1>
              <div className="flex items-center gap-2 mt-1">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm text-muted-foreground">Live synced</span>
                <span className="text-sm text-muted-foreground">•</span>
                <span className="text-sm font-semibold text-foreground">{totalPending} pending</span>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2 rounded-xl bg-card/80 backdrop-blur-sm hover:bg-card">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {/* ── Metric Cards ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cats.map((key) => {
          const cfg = categoryConfig[key];
          const count = counts?.[key] || 0;
          const Icon = cfg.icon;
          const isActive = activeTab === key;

          return (
            <button
              key={key}
              onClick={() => { setActiveTab(key); setSearch(""); }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border-2 bg-card p-4 text-left transition-all duration-200",
                isActive
                  ? `border-transparent ring-2 ${cfg.ringColor} shadow-lg scale-[1.02]`
                  : "border-border/50 hover:border-border hover:shadow-md hover:-translate-y-0.5",
                count === 0 && !isActive && "opacity-50"
              )}
            >
              {/* Active gradient indicator */}
              {isActive && (
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${cfg.gradient}`} />
              )}

              <div className="flex items-center justify-between mb-3">
                <div className={cn("flex h-10 w-10 items-center justify-center rounded-xl transition-colors", cfg.iconBg)}>
                  <Icon className={cn("h-5 w-5", cfg.textColor)} />
                </div>
                {count > 0 && (
                  <div className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white bg-gradient-to-r",
                    cfg.gradient
                  )}>
                    {count > 99 ? "99+" : count}
                  </div>
                )}
              </div>

              <p className={cn("text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight", cfg.textColor)}>
                {count.toLocaleString()}
              </p>
              <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">
                {cfg.shortTitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* ── Detail Section ── */}
      <div className="rounded-2xl border border-border/50 bg-card overflow-hidden shadow-sm">
        {/* Table Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-b border-border/50 bg-muted/30">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg", activeCfg.iconBg)}>
              <activeCfg.icon className={cn("h-4 w-4", activeCfg.textColor)} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">{activeCfg.title}</h2>
              <p className="text-xs text-muted-foreground">{filteredRows.length} record{filteredRows.length !== 1 ? "s" : ""}</p>
            </div>
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder={`Search ${activeCfg.shortTitle.toLowerCase()}...`}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 h-9 rounded-xl bg-background/80 border-border/50"
            />
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {activeTab === "balancePayment" && <BalanceTable rows={filteredRows} navigate={navigate} />}
          {activeTab === "dispatchPending" && <DispatchTable rows={filteredRows} navigate={navigate} />}
          {activeTab === "trackingPending" && <TrackingTable rows={filteredRows} navigate={navigate} />}
          {activeTab === "qcPending" && <QCTable rows={filteredRows} navigate={navigate} />}
          {activeTab === "pendingTickets" && <TicketsTable rows={filteredRows} navigate={navigate} />}
        </div>
      </div>
    </div>
  );
};

// ── Empty State ──
const EmptyState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-16 px-4">
    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/50 mb-4">
      <TrendingDown className="h-7 w-7 text-muted-foreground/50" />
    </div>
    <p className="text-sm font-medium text-muted-foreground">{message}</p>
    <p className="text-xs text-muted-foreground/60 mt-1">All caught up!</p>
  </div>
);

// ── Edit Action Button ──
const EditAction = ({ onClick }: { onClick: () => void }) => (
  <Button
    variant="ghost"
    size="sm"
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    className="h-7 gap-1.5 text-xs text-primary hover:text-primary hover:bg-primary/10 rounded-lg"
  >
    <ExternalLink className="h-3.5 w-3.5" />
    <span className="hidden sm:inline">Edit</span>
  </Button>
);

type TableProps = { rows: any[]; navigate: (path: string, opts?: any) => void };

// ── Balance Table ──
const BalanceTable = ({ rows, navigate }: TableProps) => (
  rows.length === 0 ? <EmptyState message="No pending balance payments" /> :
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="font-semibold">Order ID</TableHead>
        <TableHead className="font-semibold">Customer</TableHead>
        <TableHead className="font-semibold hidden lg:table-cell">Company</TableHead>
        <TableHead className="font-semibold hidden md:table-cell">Employee</TableHead>
        <TableHead className="font-semibold text-right">Total</TableHead>
        <TableHead className="font-semibold text-right hidden sm:table-cell">Received</TableHead>
        <TableHead className="font-semibold text-right">Balance</TableHead>
        <TableHead className="font-semibold hidden lg:table-cell">Date</TableHead>
        <TableHead className="font-semibold text-center w-20">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r: any) => (
        <TableRow key={r.order_id} className="group">
          <TableCell className="font-mono font-semibold text-primary">{r.order_id}</TableCell>
          <TableCell className="font-medium">{r.customer_name || "—"}</TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.company_name || "—"}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground">{r.employee_name}</TableCell>
          <TableCell className="text-right tabular-nums">{fmtCurrency(r.total_amount)}</TableCell>
          <TableCell className="text-right tabular-nums hidden sm:table-cell text-emerald-600">{fmtCurrency(r.amount_received)}</TableCell>
          <TableCell className="text-right tabular-nums font-semibold text-destructive">{fmtCurrency(r.balance_amount)}</TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{fmtDate(r.sale_date)}</TableCell>
          <TableCell className="text-center">
            <EditAction onClick={() => navigate("/balance-payments", { state: { openOrderId: r.order_id } })} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Dispatch Table ──
const DispatchTable = ({ rows, navigate }: TableProps) => (
  rows.length === 0 ? <EmptyState message="No pending dispatches" /> :
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="font-semibold">Order ID</TableHead>
        <TableHead className="font-semibold">Customer</TableHead>
        <TableHead className="font-semibold hidden lg:table-cell">Company</TableHead>
        <TableHead className="font-semibold hidden md:table-cell">Employee</TableHead>
        <TableHead className="font-semibold text-center">Total</TableHead>
        <TableHead className="font-semibold text-center">Done</TableHead>
        <TableHead className="font-semibold text-center">Left</TableHead>
        <TableHead className="font-semibold hidden lg:table-cell">Date</TableHead>
        <TableHead className="font-semibold text-center w-20">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r: any) => (
        <TableRow key={r.order_id} className="group">
          <TableCell className="font-mono font-semibold text-primary">{r.order_id}</TableCell>
          <TableCell className="font-medium">{r.customer_name || "—"}</TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.company_name || "—"}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground">{r.employee_name}</TableCell>
          <TableCell className="text-center tabular-nums font-medium">{r.totalItems}</TableCell>
          <TableCell className="text-center tabular-nums text-emerald-600 font-medium">{r.dispatched}</TableCell>
          <TableCell className="text-center">
            <Badge variant="destructive" className="tabular-nums font-bold text-xs px-2">{r.remaining}</Badge>
          </TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground text-xs">{fmtDate(r.sale_date)}</TableCell>
          <TableCell className="text-center">
            <EditAction onClick={() => navigate("/dispatch", { state: { openOrderId: r.order_id } })} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Tracking Table ──
const TrackingTable = ({ rows, navigate }: TableProps) => (
  rows.length === 0 ? <EmptyState message="No pending tracking" /> :
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="font-semibold">Order ID</TableHead>
        <TableHead className="font-semibold">Customer</TableHead>
        <TableHead className="font-semibold hidden md:table-cell">Company</TableHead>
        <TableHead className="font-semibold hidden sm:table-cell">Courier</TableHead>
        <TableHead className="font-semibold hidden lg:table-cell">Mode</TableHead>
        <TableHead className="font-semibold">Date</TableHead>
        <TableHead className="font-semibold text-center w-20">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r: any, i: number) => (
        <TableRow key={`${r.order_id}-${i}`} className="group">
          <TableCell className="font-mono font-semibold text-primary">{r.order_id || "—"}</TableCell>
          <TableCell className="font-medium">{r.customer_name || "—"}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground">{r.company_name || "—"}</TableCell>
          <TableCell className="hidden sm:table-cell text-muted-foreground">{r.courier_partner || "—"}</TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.shipping_mode || "—"}</TableCell>
          <TableCell className="text-muted-foreground text-xs">{fmtDate(r.created_at)}</TableCell>
          <TableCell className="text-center">
            <EditAction onClick={() => navigate("/dispatch", { state: { openOrderId: r.order_id, activeTab: "tracking" } })} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── QC Table ──
const QCTable = ({ rows, navigate }: TableProps) => (
  rows.length === 0 ? <EmptyState message="No pending QC items" /> :
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="font-semibold">Serial Number</TableHead>
        <TableHead className="font-semibold">Product</TableHead>
        <TableHead className="font-semibold hidden md:table-cell">Category</TableHead>
        <TableHead className="font-semibold">Status</TableHead>
        <TableHead className="font-semibold hidden sm:table-cell">In Date</TableHead>
        <TableHead className="font-semibold text-center w-20">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r: any) => (
        <TableRow key={r.id} className="group">
          <TableCell className="font-mono font-semibold text-primary">{r.serial_number}</TableCell>
          <TableCell className="font-medium">{r.product_name}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground">{r.category || "—"}</TableCell>
          <TableCell>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800 text-xs">
              {r.qc_result}
            </Badge>
          </TableCell>
          <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{fmtDate(r.in_date)}</TableCell>
          <TableCell className="text-center">
            <EditAction onClick={() => navigate("/quality-check", { state: { openSerialNumber: r.serial_number } })} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Tickets Table ──
const TicketsTable = ({ rows, navigate }: TableProps) => (
  rows.length === 0 ? <EmptyState message="No pending tickets" /> :
  <Table>
    <TableHeader>
      <TableRow className="hover:bg-transparent">
        <TableHead className="font-semibold">Title</TableHead>
        <TableHead className="font-semibold hidden md:table-cell">Customer</TableHead>
        <TableHead className="font-semibold hidden lg:table-cell">Company</TableHead>
        <TableHead className="font-semibold">Status</TableHead>
        <TableHead className="font-semibold">Priority</TableHead>
        <TableHead className="font-semibold hidden sm:table-cell">Created</TableHead>
        <TableHead className="font-semibold text-center w-20">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map((r: any) => (
        <TableRow key={r.id} className="group">
          <TableCell className="font-medium max-w-[220px] truncate">{r.title}</TableCell>
          <TableCell className="hidden md:table-cell text-muted-foreground">{r.customer_name || "—"}</TableCell>
          <TableCell className="hidden lg:table-cell text-muted-foreground">{r.company_name || "—"}</TableCell>
          <TableCell>
            <Badge variant="outline" className="text-xs">{r.status}</Badge>
          </TableCell>
          <TableCell>
            <Badge
              className={cn("text-xs border-0", {
                "bg-rose-500/10 text-rose-600": r.priority === "Urgent",
                "bg-amber-500/10 text-amber-600": r.priority === "High",
                "bg-blue-500/10 text-blue-600": r.priority === "Normal",
                "bg-muted text-muted-foreground": !["Urgent", "High", "Normal"].includes(r.priority),
              })}
            >
              {r.priority}
            </Badge>
          </TableCell>
          <TableCell className="hidden sm:table-cell text-muted-foreground text-xs">{fmtDate(r.created_at)}</TableCell>
          <TableCell className="text-center">
            <EditAction onClick={() => navigate("/tasks", { state: { openTaskId: r.id } })} />
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default PendencyPage;
