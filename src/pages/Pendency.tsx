import { useState } from "react";
import { usePendency } from "@/hooks/usePendency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  CreditCard,
  Truck,
  MapPin,
  ClipboardCheck,
  AlertCircle,
  ArrowLeft,
  RefreshCw,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";

type Category = "balancePayment" | "dispatchPending" | "trackingPending" | "qcPending" | "pendingTickets";

const categoryConfig: Record<Category, { title: string; icon: React.ElementType; color: string; bgColor: string }> = {
  balancePayment: { title: "Balance Payment Pending", icon: CreditCard, color: "text-amber-600", bgColor: "bg-amber-50 dark:bg-amber-950/30" },
  dispatchPending: { title: "Dispatch Pending", icon: Truck, color: "text-blue-600", bgColor: "bg-blue-50 dark:bg-blue-950/30" },
  trackingPending: { title: "Tracking Details Pending", icon: MapPin, color: "text-purple-600", bgColor: "bg-purple-50 dark:bg-purple-950/30" },
  qcPending: { title: "QC Pending", icon: ClipboardCheck, color: "text-orange-600", bgColor: "bg-orange-50 dark:bg-orange-950/30" },
  pendingTickets: { title: "Pending Tickets", icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-50 dark:bg-red-950/30" },
};

const formatDate = (d: string | null) => {
  if (!d) return "—";
  try { return format(new Date(d), "dd MMM yyyy"); } catch { return "—"; }
};

const formatCurrency = (v: number | null) => {
  if (v == null) return "₹0";
  return `₹${Number(v).toLocaleString("en-IN")}`;
};

const PendencyPage = () => {
  const { data, isLoading, isError } = usePendency();
  const [activeCategory, setActiveCategory] = useState<Category | null>(null);
  const queryClient = useQueryClient();

  const handleRefresh = () => queryClient.invalidateQueries({ queryKey: ["pendency"] });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-24" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return <div className="text-center py-12 text-destructive">Failed to load pendency data.</div>;
  }

  const categories: Category[] = ["balancePayment", "dispatchPending", "trackingPending", "qcPending", "pendingTickets"];
  const totalPending = categories.reduce((sum, c) => sum + data[c].count, 0);

  // Detail view
  if (activeCategory) {
    const cfg = categoryConfig[activeCategory];
    const records = data[activeCategory].records;
    const Icon = cfg.icon;

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setActiveCategory(null)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <Icon className={`h-6 w-6 ${cfg.color}`} />
          <h2 className="text-lg sm:text-xl font-bold text-foreground">{cfg.title}</h2>
          <Badge variant="secondary" className="text-sm">{records.length}</Badge>
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              {activeCategory === "balancePayment" && (
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
                    {records.map((r: any) => (
                      <TableRow key={r.order_id}>
                        <TableCell className="font-medium">{r.order_id}</TableCell>
                        <TableCell>{r.customer_name || "—"}</TableCell>
                        <TableCell>{r.company_name || "—"}</TableCell>
                        <TableCell>{r.employee_name}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.total_amount)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(r.amount_received)}</TableCell>
                        <TableCell className="text-right font-semibold text-destructive">{formatCurrency(r.balance_amount)}</TableCell>
                        <TableCell>{formatDate(r.sale_date)}</TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">No pending balance payments</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeCategory === "dispatchPending" && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order ID</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Sale Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((r: any) => (
                      <TableRow key={r.order_id}>
                        <TableCell className="font-medium">{r.order_id}</TableCell>
                        <TableCell>{r.customer_name || "—"}</TableCell>
                        <TableCell>{r.company_name || "—"}</TableCell>
                        <TableCell>{r.employee_name}</TableCell>
                        <TableCell>{formatDate(r.sale_date)}</TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending dispatches</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeCategory === "trackingPending" && (
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
                    {records.map((r: any, i: number) => (
                      <TableRow key={i}>
                        <TableCell className="font-medium">{r.order_id || "—"}</TableCell>
                        <TableCell>{r.courier_partner || "—"}</TableCell>
                        <TableCell>{r.shipping_mode || "—"}</TableCell>
                        <TableCell>{formatDate(r.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No pending tracking details</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeCategory === "qcPending" && (
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
                    {records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.serial_number}</TableCell>
                        <TableCell>{r.product_name}</TableCell>
                        <TableCell>{r.category || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{r.qc_result}</Badge></TableCell>
                        <TableCell>{formatDate(r.in_date)}</TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No pending QC items</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}

              {activeCategory === "pendingTickets" && (
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
                    {records.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium max-w-[200px] truncate">{r.title}</TableCell>
                        <TableCell>{r.customer_name || "—"}</TableCell>
                        <TableCell>{r.company_name || "—"}</TableCell>
                        <TableCell><Badge variant="outline">{r.status}</Badge></TableCell>
                        <TableCell>
                          <Badge variant={r.priority === "Urgent" ? "destructive" : "secondary"}>{r.priority}</Badge>
                        </TableCell>
                        <TableCell>{formatDate(r.created_at)}</TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No pending tickets</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Summary cards view
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">Pendency Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total pending items: <span className="font-semibold text-foreground">{totalPending}</span>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {categories.map((key) => {
          const cfg = categoryConfig[key];
          const count = data[key].count;
          const Icon = cfg.icon;

          return (
            <Card
              key={key}
              className={`cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${count > 0 ? "border-border" : "border-border/50 opacity-70"}`}
              onClick={() => setActiveCategory(key)}
            >
              <CardHeader className="pb-2">
                <div className={`flex items-center justify-between`}>
                  <div className={`p-2.5 rounded-xl ${cfg.bgColor}`}>
                    <Icon className={`h-6 w-6 ${cfg.color}`} />
                  </div>
                  {count > 0 && (
                    <Badge variant="destructive" className="text-xs px-2">
                      Pending
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className={`text-3xl sm:text-4xl font-bold ${count > 0 ? cfg.color : "text-muted-foreground"}`}>
                  {count}
                </p>
                <CardTitle className="text-sm font-medium text-muted-foreground mt-1.5">
                  {cfg.title}
                </CardTitle>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default PendencyPage;
