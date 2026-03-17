import { useState, useEffect } from "react";
import { usePendency } from "@/hooks/usePendency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  CreditCard, Truck, MapPin, ClipboardCheck, AlertCircle,
  RefreshCw, Layers, Search,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

type Category = "all" | "balancePayment" | "dispatchPending" | "trackingPending" | "qcPending" | "pendingTickets";

const categoryConfig = {
  balancePayment: { title: "Balance Payment", icon: CreditCard, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  dispatchPending: { title: "Dispatch", icon: Truck, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  trackingPending: { title: "Tracking", icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  qcPending: { title: "QC", icon: ClipboardCheck, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  pendingTickets: { title: "Tickets", icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
} as const;

const cats: (keyof typeof categoryConfig)[] = ["balancePayment", "dispatchPending", "trackingPending", "qcPending", "pendingTickets"];

const fmtDate = (d: string | null) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
};
const fmtCurrency = (v: number | null) => v == null ? "₹0" : `₹${Number(v).toLocaleString("en-IN")}`;

const PendencyPage = () => {
  const { counts, records, isLoading } = usePendency();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<Category>("all");
  const [search, setSearch] = useState("");

  // Realtime subscriptions for live updates
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  // Build table rows based on active tab
  const getTableData = () => {
    const lowerSearch = search.toLowerCase();
    const filterBySearch = (rows: any[], fields: string[]) =>
      lowerSearch ? rows.filter(r => fields.some(f => String(r[f] || "").toLowerCase().includes(lowerSearch))) : rows;

    if (activeTab === "balancePayment" || activeTab === "all") {
      const rows = filterBySearch(records.balancePayment, ["order_id", "customer_name", "company_name", "employee_name"]);
      if (activeTab !== "all") return { key: "balance", rows };
    }
    if (activeTab === "dispatchPending" || activeTab === "all") {
      const rows = filterBySearch(records.dispatchPending, ["order_id", "customer_name", "company_name", "employee_name"]);
      if (activeTab !== "all") return { key: "dispatch", rows };
    }
    if (activeTab === "trackingPending" || activeTab === "all") {
      const rows = filterBySearch(records.trackingPending, ["order_id", "courier_partner"]);
      if (activeTab !== "all") return { key: "tracking", rows };
    }
    if (activeTab === "qcPending" || activeTab === "all") {
      const rows = filterBySearch(records.qcPending, ["serial_number", "product_name", "category"]);
      if (activeTab !== "all") return { key: "qc", rows };
    }
    if (activeTab === "pendingTickets" || activeTab === "all") {
      const rows = filterBySearch(records.pendingTickets, ["title", "customer_name", "company_name"]);
      if (activeTab !== "all") return { key: "tickets", rows };
    }
    return null;
  };

  const tableData = getTableData();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pendency Overview</h1>
          <p className="text-sm text-muted-foreground">
            {totalPending} Total Pending • Live synced
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Summary Cards - always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {cats.map((key) => {
          const cfg = categoryConfig[key];
          const count = counts?.[key] || 0;
          const Icon = cfg.icon;
          const isActive = activeTab === key;
          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-md border-2 ${isActive ? "border-primary ring-2 ring-primary/20" : count > 0 ? "border-border" : "border-border/40 opacity-60"}`}
              onClick={() => setActiveTab(key)}
            >
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${cfg.bgColor}`}>
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  {count > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0 ml-auto">!</Badge>}
                </div>
                <p className={`text-2xl sm:text-3xl font-bold ${count > 0 ? cfg.color : "text-muted-foreground"}`}>{count}</p>
                <p className="text-xs font-medium text-muted-foreground mt-0.5 truncate">{cfg.title}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v as Category); setSearch(""); }} className="flex-1">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm gap-1">
              <Layers className="h-3.5 w-3.5" /> All ({totalPending})
            </TabsTrigger>
            {cats.map(key => {
              const cfg = categoryConfig[key];
              const Icon = cfg.icon;
              return (
                <TabsTrigger key={key} value={key} className="text-xs sm:text-sm gap-1">
                  <Icon className="h-3.5 w-3.5" /> {cfg.title} ({counts?.[key] || 0})
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
        {activeTab !== "all" && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-9" />
          </div>
        )}
      </div>

      {/* Data Table - inline, no navigation */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            {activeTab === "all" ? (
              <AllPendencyTable records={records} counts={counts} onTabSwitch={setActiveTab} />
            ) : tableData?.key === "balance" ? (
              <BalanceTable rows={tableData.rows} />
            ) : tableData?.key === "dispatch" ? (
              <DispatchTable rows={tableData.rows} />
            ) : tableData?.key === "tracking" ? (
              <TrackingTable rows={tableData.rows} />
            ) : tableData?.key === "qc" ? (
              <QCTable rows={tableData.rows} />
            ) : tableData?.key === "tickets" ? (
              <TicketsTable rows={tableData.rows} />
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ── "All" tab: summary rows per category ──
const AllPendencyTable = ({ records, counts, onTabSwitch }: { records: any; counts: any; onTabSwitch: (c: Category) => void }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Category</TableHead>
        <TableHead className="text-right">Pending Count</TableHead>
        <TableHead className="text-right">Action</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {cats.map(key => {
        const cfg = categoryConfig[key];
        const Icon = cfg.icon;
        const count = counts?.[key] || 0;
        return (
          <TableRow key={key} className="cursor-pointer hover:bg-muted/50" onClick={() => onTabSwitch(key)}>
            <TableCell>
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg ${cfg.bgColor}`}><Icon className={`h-4 w-4 ${cfg.color}`} /></div>
                <span className="font-medium">{cfg.title} Pending</span>
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Badge variant={count > 0 ? "destructive" : "secondary"} className="text-sm px-3">{count}</Badge>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); onTabSwitch(key); }}>
                View →
              </Button>
            </TableCell>
          </TableRow>
        );
      })}
    </TableBody>
  </Table>
);

// ── Balance Table ──
const BalanceTable = ({ rows }: { rows: any[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Order ID</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>Employee</TableHead>
        <TableHead className="text-right">Total</TableHead>
        <TableHead className="text-right">Received</TableHead>
        <TableHead className="text-right">Balance</TableHead>
        <TableHead>Date</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pending balance payments</TableCell></TableRow>
      ) : rows.map((r: any) => (
        <TableRow key={r.order_id}>
          <TableCell className="font-medium">{r.order_id}</TableCell>
          <TableCell>{r.customer_name || "—"}</TableCell>
          <TableCell>{r.company_name || "—"}</TableCell>
          <TableCell>{r.employee_name}</TableCell>
          <TableCell className="text-right">{fmtCurrency(r.total_amount)}</TableCell>
          <TableCell className="text-right">{fmtCurrency(r.amount_received)}</TableCell>
          <TableCell className="text-right font-semibold text-destructive">{fmtCurrency(r.balance_amount)}</TableCell>
          <TableCell>{fmtDate(r.sale_date)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Dispatch Table ──
const DispatchTable = ({ rows }: { rows: any[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Order ID</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>Employee</TableHead>
        <TableHead className="text-right">Total Items</TableHead>
        <TableHead className="text-right">Dispatched</TableHead>
        <TableHead className="text-right">Remaining</TableHead>
        <TableHead>Sale Date</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pending dispatches</TableCell></TableRow>
      ) : rows.map((r: any) => (
        <TableRow key={r.order_id}>
          <TableCell className="font-medium">{r.order_id}</TableCell>
          <TableCell>{r.customer_name || "—"}</TableCell>
          <TableCell>{r.company_name || "—"}</TableCell>
          <TableCell>{r.employee_name}</TableCell>
          <TableCell className="text-right">{r.totalItems}</TableCell>
          <TableCell className="text-right">{r.dispatched}</TableCell>
          <TableCell className="text-right font-semibold text-destructive">{r.remaining}</TableCell>
          <TableCell>{fmtDate(r.sale_date)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Tracking Table ──
const TrackingTable = ({ rows }: { rows: any[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Order ID</TableHead>
        <TableHead>Courier Partner</TableHead>
        <TableHead>Shipping Mode</TableHead>
        <TableHead>Dispatch Date</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending tracking</TableCell></TableRow>
      ) : rows.map((r: any, i: number) => (
        <TableRow key={`${r.order_id}-${i}`}>
          <TableCell className="font-medium">{r.order_id || "—"}</TableCell>
          <TableCell>{r.courier_partner || "—"}</TableCell>
          <TableCell>{r.shipping_mode || "—"}</TableCell>
          <TableCell>{fmtDate(r.created_at)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── QC Table ──
const QCTable = ({ rows }: { rows: any[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Serial Number</TableHead>
        <TableHead>Product</TableHead>
        <TableHead>Category</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>In Date</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending QC</TableCell></TableRow>
      ) : rows.map((r: any) => (
        <TableRow key={r.id}>
          <TableCell className="font-medium">{r.serial_number}</TableCell>
          <TableCell>{r.product_name}</TableCell>
          <TableCell>{r.category || "—"}</TableCell>
          <TableCell><Badge variant="outline">{r.qc_result}</Badge></TableCell>
          <TableCell>{fmtDate(r.in_date)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

// ── Tickets Table ──
const TicketsTable = ({ rows }: { rows: any[] }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>Title</TableHead>
        <TableHead>Customer</TableHead>
        <TableHead>Company</TableHead>
        <TableHead>Status</TableHead>
        <TableHead>Priority</TableHead>
        <TableHead>Created</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 ? (
        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending tickets</TableCell></TableRow>
      ) : rows.map((r: any) => (
        <TableRow key={r.id}>
          <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
          <TableCell>{r.customer_name || "—"}</TableCell>
          <TableCell>{r.company_name || "—"}</TableCell>
          <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
          <TableCell><Badge variant={r.priority === "Urgent" ? "destructive" : "secondary"}>{r.priority}</Badge></TableCell>
          <TableCell>{fmtDate(r.created_at)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export default PendencyPage;
