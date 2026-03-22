import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const TodayWorkDoneSection = () => {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);

  const dayStart = startOfDay(selectedDate).toISOString();
  const dayEnd = endOfDay(selectedDate).toISOString();

  // Fetch all data in parallel
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
        .select("quotation_no, customer_name, grand_total, status, created_at")
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
        .select("order_id, amount, account_received, payment_date, created_at")
        .gte("created_at", dayStart)
        .lte("created_at", dayEnd)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // KPI calculations
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

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(v);

  const formatTime = (d: string | null) => (d ? format(new Date(d), "hh:mm a") : "—");

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
    { label: "Sales Done", value: kpis.salesCount, icon: ShoppingCart, color: "text-emerald-600", bg: "bg-emerald-500/10" },
    { label: "Total Revenue", value: formatCurrency(kpis.totalSaleAmount), icon: IndianRupee, color: "text-blue-600", bg: "bg-blue-500/10" },
    { label: "Payment Received", value: formatCurrency(kpis.totalPaymentReceived), icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-500/10" },
    { label: "Quotations", value: kpis.quotationsCount, icon: FileCheck, color: "text-amber-600", bg: "bg-amber-500/10" },
    { label: "QC Completed", value: kpis.qcCompleted, icon: ClipboardCheck, color: "text-cyan-600", bg: "bg-cyan-500/10" },
    { label: "Dispatched", value: kpis.dispatchCompleted, icon: Truck, color: "text-rose-600", bg: "bg-rose-500/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
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
                onSelect={(d) => { if (d) { setSelectedDate(d); setCalendarOpen(false); }}}
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

      {/* KPI Cards */}
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

      {/* Category Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sales Activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="h-5 w-5 text-emerald-600" />
              Sales Activities
              <Badge variant="secondary" className="ml-auto">{(salesData?.length || 0) + (quotationsData?.length || 0)}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Activity</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {salesData?.map((s) => (
                  <TableRow key={s.order_id}>
                    <TableCell className="font-medium text-sm">Sale</TableCell>
                    <TableCell className="text-sm">{s.customer_name || s.order_id}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(s.total_amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(s.created_at)}</TableCell>
                  </TableRow>
                ))}
                {quotationsData?.map((q) => (
                  <TableRow key={q.quotation_no}>
                    <TableCell className="font-medium text-sm">Quotation</TableCell>
                    <TableCell className="text-sm">{q.customer_name}</TableCell>
                    <TableCell className="text-right text-sm font-medium">{formatCurrency(q.grand_total)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(q.created_at)}</TableCell>
                  </TableRow>
                ))}
                {paymentsData?.map((p, i) => (
                  <TableRow key={`pay-${i}`}>
                    <TableCell className="font-medium text-sm">Payment</TableCell>
                    <TableCell className="text-sm">Order: {p.order_id}</TableCell>
                    <TableCell className="text-right text-sm font-medium text-emerald-600">{formatCurrency(p.amount)}</TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(p.created_at)}</TableCell>
                  </TableRow>
                ))}
                {!salesData?.length && !quotationsData?.length && !paymentsData?.length && (
                  <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground text-sm py-6">No sales activities today</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Inventory Activities */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Package className="h-5 w-5 text-blue-600" />
              Inventory Activities
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
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(item.created_at)}</TableCell>
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
              Operations (QC & Dispatch)
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
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(q.qc_date)}</TableCell>
                  </TableRow>
                ))}
                {dispatchData?.slice(0, 5).map((d) => (
                  <TableRow key={`disp-${d.serial_number}`}>
                    <TableCell className="font-medium text-sm">Dispatch</TableCell>
                    <TableCell className="text-sm">{d.customer_name || d.order_id}</TableCell>
                    <TableCell><Badge className="text-xs bg-emerald-500/10 text-emerald-600 border-0">Dispatched</Badge></TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(d.dispatch_date)}</TableCell>
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
              Tasks & Work
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
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(t.created_at)}</TableCell>
                  </TableRow>
                ))}
                {tasksCompleted?.map((t, i) => (
                  <TableRow key={`td-${i}`}>
                    <TableCell className="font-medium text-sm text-emerald-600">Completed ✅</TableCell>
                    <TableCell className="text-sm max-w-[150px] truncate">{t.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs">{t.priority}</Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">{formatTime(t.completed_at)}</TableCell>
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
