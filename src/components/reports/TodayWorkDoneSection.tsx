import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import {
  ShoppingCart,
  Package,
  ClipboardCheck,
  Truck,
  ListTodo,
  CalendarIcon,
  Download,
  TrendingUp,
  IndianRupee,
  FileCheck,
  Activity,
  Receipt,
  Wallet,
  Search,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type SalesTab = "sales" | "quotations" | "payments";

const fmtCurrency = (v: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

const fmtTime = (d: string | null) => (d ? format(new Date(d), "hh:mm a") : "—");
const fmtDate = (d: string | null) => (d ? format(new Date(d), "dd MMM yyyy") : "—");

export const TodayWorkDoneSection = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [salesTab, setSalesTab] = useState<SalesTab>("sales");
  const [salesSearch, setSalesSearch] = useState("");

  const dayStart = startOfDay(selectedDate).toISOString();
  const dayEnd = endOfDay(selectedDate).toISOString();

  // ── Existing queries (all retained) ─────────────────────────────────────────
  const { data: salesData } = useQuery({
    queryKey: ["today-sales", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("order_id, customer_name, total_amount, amount_received, sale_type, employee_name, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: quotationsData } = useQuery({
    queryKey: ["today-quotations", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quotations")
        .select("id, quotation_no, customer_name, company_name, grand_total, status, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: inventoryData } = useQuery({
    queryKey: ["today-inventory", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("serial_number, product_name, status, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: qcData } = useQuery({
    queryKey: ["today-qc", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("serial_number, product_name, qc_result, checked_by, qc_date")
        .gte("qc_date", dayStart)
        .lte("qc_date", dayEnd)
        .not("qc_result", "eq", "Pending")
        .order("qc_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: dispatchData } = useQuery({
    queryKey: ["today-dispatch", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inventory")
        .select("serial_number, product_name, order_id, customer_name, dispatch_date")
        .eq("status", "Dispatched")
        .gte("dispatch_date", dayStart)
        .lte("dispatch_date", dayEnd)
        .order("dispatch_date", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ["today-shipments", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shipments")
        .select("order_id, courier_partner, tracking_id, shipping_mode, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tasksCreated } = useQuery({
    queryKey: ["today-tasks-created", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("title, status, priority, task_type, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: tasksCompleted } = useQuery({
    queryKey: ["today-tasks-completed", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("title, status, priority, task_type, completed_at")
        .gte("completed_at", dayStart)
        .lte("completed_at", dayEnd)
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: paymentsData } = useQuery({
    queryKey: ["today-payments", dayStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_history")
        .select("id, order_id, amount, account_received, payment_reference, payment_date, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // ── KPI calculations (existing) ──────────────────────────────────────────────
  const kpis = useMemo(() => {
    const totalSaleAmount = salesData?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0;
    const totalPaymentReceived = paymentsData?.reduce((s, r) => s + (r.amount || 0), 0) || 0;
    return {
      salesCount: salesData?.length || 0,
      quotationsCount: quotationsData?.length || 0,
      totalSaleAmount,
      totalPaymentReceived,
      inventoryAdded: inventoryData?.length || 0,
      qcCompleted: qcData?.length || 0,
      dispatchCompleted: dispatchData?.length || 0,
      shipmentsCreated: shipmentsData?.length || 0,
      tasksCreated: tasksCreated?.length || 0,
      tasksCompleted: tasksCompleted?.length || 0,
    };
  }, [salesData, quotationsData, inventoryData, qcData, dispatchData, shipmentsData, tasksCreated, tasksCompleted, paymentsData]);

  // ── Sales tab summaries ───────────────────────────────────────────────────────
  const salesSummary = useMemo(() => ({
    count: salesData?.length || 0,
    total: salesData?.reduce((s, r) => s + (r.total_amount || 0), 0) || 0,
  }), [salesData]);

  const quotationsSummary = useMemo(() => ({
    count: quotationsData?.length || 0,
    total: quotationsData?.reduce((s, r) => s + (r.grand_total || 0), 0) || 0,
  }), [quotationsData]);

  const paymentsSummary = useMemo(() => ({
    count: paymentsData?.length || 0,
    total: paymentsData?.reduce((s, r) => s + (r.amount || 0), 0) || 0,
  }), [paymentsData]);

  // ── Filtered rows for active sales tab ───────────────────────────────────────
  const filteredSalesRows = useMemo(() => {
    const raw =
      salesTab === "sales" ? (salesData || []) :
      salesTab === "quotations" ? (quotationsData || []) :
      (paymentsData || []);
    if (!salesSearch) return raw;
    const q = salesSearch.toLowerCase();
    return raw.filter((r: any) =>
      Object.values(r).some((v) => String(v ?? "").toLowerCase().includes(q))
    );
  }, [salesTab, salesData, quotationsData, paymentsData, salesSearch]);

  // ── Export CSV ────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const rows = [
      ["Category", "Activity", "Count / Value"],
      ["Sales", "Quotations Created", kpis.quotationsCount],
      ["Sales", "Sales Done", kpis.salesCount],
      ["Sales", "Total Sale Amount", kpis.totalSaleAmount],
      ["Sales", "Payment Received", kpis.totalPaymentReceived],
      ["Inventory", "Products Added", kpis.inventoryAdded],
      ["Operations", "QC Completed", kpis.qcCompleted],
      ["Operations", "Dispatch Completed", kpis.dispatchCompleted],
      ["Operations", "Shipments Created", kpis.shipmentsCreated],
      ["Tasks", "Tasks Created", kpis.tasksCreated],
      ["Tasks", "Tasks Completed", kpis.tasksCompleted],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `work-done-${format(selectedDate, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const kpiCards = [
    { label: "Sales Done",        value: kpis.salesCount,                     icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Total Revenue",     value: fmtCurrency(kpis.totalSaleAmount),   icon: IndianRupee,  color: "text-blue-600",    bg: "bg-blue-500/10" },
    { label: "Payment Received",  value: fmtCurrency(kpis.totalPaymentReceived), icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-500/10" },
    { label: "Quotations",        value: kpis.quotationsCount,                icon: FileCheck,    color: "text-amber-600",   bg: "bg-amber-500/10" },
    { label: "QC Completed",      value: kpis.qcCompleted,                    icon: ClipboardCheck, color: "text-cyan-600",  bg: "bg-cyan-500/10" },
    { label: "Dispatched",        value: kpis.dispatchCompleted,              icon: Truck,        color: "text-rose-600",    bg: "bg-rose-500/10" },
  ];

  // Config for the 3 sales sub-tabs
  const salesTabCfg = [
    {
      key: "sales" as SalesTab,
      label: "Sale",
      icon: ShoppingCart,
      gradient: "from-emerald-500 to-green-500",
      iconBg: "bg-emerald-500/10",
      textColor: "text-emerald-600",
      ringColor: "ring-emerald-500/30",
      count: salesSummary.count,
      total: salesSummary.total,
    },
    {
      key: "quotations" as SalesTab,
      label: "Quotation",
      icon: Receipt,
      gradient: "from-violet-500 to-purple-500",
      iconBg: "bg-violet-500/10",
      textColor: "text-violet-600",
      ringColor: "ring-violet-500/30",
      count: quotationsSummary.count,
      total: quotationsSummary.total,
    },
    {
      key: "payments" as SalesTab,
      label: "Balance Payment Received",
      icon: Wallet,
      gradient: "from-blue-500 to-cyan-500",
      iconBg: "bg-blue-500/10",
      textColor: "text-blue-600",
      ringColor: "ring-blue-500/30",
      count: paymentsSummary.count,
      total: paymentsSummary.total,
    },
  ];
  const activeTabCfg = salesTabCfg.find((t) => t.key === salesTab)!;

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Today's Work Done</h2>
          <p className="text-sm text-muted-foreground">{format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
        </div>
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {format(selectedDate, "MMM d, yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); setSalesSearch(""); } }}
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* ── KPI Cards (existing, retained) ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpiCards.map((kpi) => (
          <Card key={kpi.label} className="border-border/50">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-lg sm:text-xl font-bold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Sales Activity — 3 structured tabs ── */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingCart className="h-5 w-5 text-emerald-600" />
            Sales Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {/* Tab summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {salesTabCfg.map((tab) => {
              const Icon = tab.icon;
              const isActive = salesTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => { setSalesTab(tab.key); setSalesSearch(""); }}
                  className={cn(
                    "relative overflow-hidden rounded-xl border-2 bg-background p-4 text-left transition-all duration-200",
                    isActive
                      ? `border-transparent ring-2 ${tab.ringColor} shadow-md`
                      : "border-border/50 hover:border-border hover:shadow-sm hover:-translate-y-0.5"
                  )}
                >
                  {isActive && (
                    <div className={`absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r ${tab.gradient}`} />
                  )}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className={cn("flex h-8 w-8 items-center justify-center rounded-lg shrink-0", tab.iconBg)}>
                      <Icon className={cn("h-4 w-4", tab.textColor)} />
                    </div>
                    <div className="text-right">
                      <p className={cn("text-lg font-extrabold tabular-nums", tab.textColor)}>
                        {fmtCurrency(tab.total)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {tab.count} {tab.count === 1 ? "record" : "records"}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs font-semibold text-foreground/70 truncate">{tab.label}</p>
                </button>
              );
            })}
          </div>

          {/* Detail table with search */}
          <div className="rounded-xl border border-border/50 overflow-hidden">
            {/* Table header bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-4 py-2.5 bg-muted/30 border-b border-border/50">
              <div className="flex items-center gap-2">
                <div className={cn("flex h-7 w-7 items-center justify-center rounded-md", activeTabCfg.iconBg)}>
                  <activeTabCfg.icon className={cn("h-3.5 w-3.5", activeTabCfg.textColor)} />
                </div>
                <div>
                  <span className="text-sm font-semibold text-foreground">{activeTabCfg.label}</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {filteredSalesRows.length} record{filteredSalesRows.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder={`Search ${activeTabCfg.label.toLowerCase()}…`}
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="pl-8 h-8 text-sm rounded-lg bg-background/80 border-border/50"
                />
              </div>
            </div>

            {/* Table content */}
            <div className="overflow-x-auto">
              {salesTab === "sales" && (
                filteredSalesRows.length === 0
                  ? <EmptyTabState message="No sales for this date" />
                  : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="hidden md:table-cell">Employee</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead className="text-right hidden sm:table-cell">Received</TableHead>
                          <TableHead className="hidden lg:table-cell">Type</TableHead>
                          <TableHead className="hidden sm:table-cell">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesRows.map((s: any) => (
                          <TableRow key={s.order_id}>
                            <TableCell className="font-mono font-semibold text-primary text-sm">{s.order_id}</TableCell>
                            <TableCell className="font-medium text-sm">{s.customer_name || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{s.employee_name || "—"}</TableCell>
                            <TableCell className="text-right font-semibold text-emerald-600 tabular-nums text-sm">{fmtCurrency(s.total_amount)}</TableCell>
                            <TableCell className="text-right tabular-nums hidden sm:table-cell text-sm text-muted-foreground">{fmtCurrency(s.amount_received)}</TableCell>
                            <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{s.sale_type || "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(s.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
              )}

              {salesTab === "quotations" && (
                filteredSalesRows.length === 0
                  ? <EmptyTabState message="No quotations for this date" />
                  : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Quotation No.</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead className="hidden md:table-cell">Company</TableHead>
                          <TableHead className="text-right">Total Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="hidden sm:table-cell">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesRows.map((q: any) => (
                          <TableRow key={q.id || q.quotation_no}>
                            <TableCell className="font-mono font-semibold text-primary text-sm">{q.quotation_no}</TableCell>
                            <TableCell className="font-medium text-sm">{q.customer_name || "—"}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{q.company_name || "—"}</TableCell>
                            <TableCell className="text-right font-semibold text-violet-600 tabular-nums text-sm">{fmtCurrency(q.grand_total)}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-xs">{q.status || "—"}</Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(q.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
              )}

              {salesTab === "payments" && (
                filteredSalesRows.length === 0
                  ? <EmptyTabState message="No payments received for this date" />
                  : (
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Order ID</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="hidden md:table-cell">Account Received</TableHead>
                          <TableHead className="hidden sm:table-cell">Reference</TableHead>
                          <TableHead className="hidden lg:table-cell">Payment Date</TableHead>
                          <TableHead className="hidden sm:table-cell">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSalesRows.map((p: any) => (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono font-semibold text-primary text-sm">{p.order_id}</TableCell>
                            <TableCell className="text-right font-semibold text-blue-600 tabular-nums text-sm">{fmtCurrency(p.amount)}</TableCell>
                            <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.account_received || "—"}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{p.payment_reference || "—"}</TableCell>
                            <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{fmtDate(p.payment_date)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(p.created_at)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Other activity cards (existing, retained) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Inventory Activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-blue-600" />
              Inventory Added
              <Badge variant="secondary" className="ml-auto">{inventoryData?.length || 0}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serial Number</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventoryData?.slice(0, 10).map((item) => (
                  <TableRow key={item.serial_number}>
                    <TableCell className="font-mono text-sm">{item.serial_number}</TableCell>
                    <TableCell className="text-sm">{item.product_name}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "In Stock" ? "default" : "secondary"} className="text-xs">{item.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(item.created_at)}</TableCell>
                  </TableRow>
                ))}
                {!inventoryData?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No inventory added today</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
            {(inventoryData?.length || 0) > 10 && (
              <p className="text-xs text-muted-foreground text-center mt-2">+{(inventoryData?.length || 0) - 10} more items</p>
            )}
          </CardContent>
        </Card>

        {/* Operations */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-5 w-5 text-cyan-600" />
              Operations (QC &amp; Dispatch)
              <Badge variant="secondary" className="ml-auto">{(qcData?.length || 0) + (dispatchData?.length || 0)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {qcData?.slice(0, 5).map((q) => (
                  <TableRow key={`qc-${q.serial_number}`}>
                    <TableCell className="font-medium text-sm">QC</TableCell>
                    <TableCell className="text-sm">{q.serial_number}</TableCell>
                    <TableCell>
                      <Badge variant={q.qc_result === "Pass" ? "default" : "destructive"} className="text-xs">{q.qc_result}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(q.qc_date)}</TableCell>
                  </TableRow>
                ))}
                {dispatchData?.slice(0, 5).map((d) => (
                  <TableRow key={`disp-${d.serial_number}`}>
                    <TableCell className="font-medium text-sm">Dispatch</TableCell>
                    <TableCell className="text-sm">{d.customer_name || d.order_id}</TableCell>
                    <TableCell><Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-0">Dispatched</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(d.dispatch_date)}</TableCell>
                  </TableRow>
                ))}
                {!qcData?.length && !dispatchData?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No operations today</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="h-5 w-5 text-violet-600" />
              Tasks &amp; Work
              <Badge variant="secondary" className="ml-auto">{(tasksCreated?.length || 0) + (tasksCompleted?.length || 0)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksCreated?.map((t, i) => (
                  <TableRow key={`tc-${i}`}>
                    <TableCell className="font-medium text-sm">Created</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant={t.priority === "High" ? "destructive" : t.priority === "Normal" ? "default" : "secondary"} className="text-xs">{t.priority}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(t.created_at)}</TableCell>
                  </TableRow>
                ))}
                {tasksCompleted?.map((t, i) => (
                  <TableRow key={`td-${i}`}>
                    <TableCell className="font-medium text-sm text-emerald-600">Completed ✅</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{t.priority}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{fmtTime(t.completed_at)}</TableCell>
                  </TableRow>
                ))}
                {!tasksCreated?.length && !tasksCompleted?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No task activity today</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// ── Shared empty state ──────────────────────────────────────────────────────────
const EmptyTabState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center py-10 text-center px-4">
    <p className="text-sm text-muted-foreground">{message}</p>
  </div>
);
