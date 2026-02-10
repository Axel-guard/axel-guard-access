import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Upload, Search, Filter } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { PendingPaymentsUploadDialog } from "./PendingPaymentsUploadDialog";
import { BalancePaymentDialog } from "@/components/forms/BalancePaymentDialog";

type StatusFilter = "all" | "pending" | "partial" | "paid";

// Fetch ALL sales (not just current month) for balance tracking
const useAllSalesForBalance = () => {
  return useQuery({
    queryKey: ["all-sales-balance"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .order("order_id", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
};

export const PendingPaymentsTable = () => {
  const { data: sales, isLoading } = useAllSalesForBalance();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const getPaymentStatus = (sale: any) => {
    const total = Number(sale.total_amount) || 0;
    const received = Number(sale.amount_received) || 0;
    if (received >= total && total > 0) return "paid";
    if (received > 0) return "partial";
    return "pending";
  };

  // Filter sales
  const filteredSales = sales?.filter((sale) => {
    const status = getPaymentStatus(sale);

    // Status filter
    if (statusFilter !== "all" && status !== statusFilter) return false;

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match =
        sale.order_id?.toLowerCase().includes(q) ||
        sale.customer_name?.toLowerCase().includes(q) ||
        sale.customer_code?.toLowerCase().includes(q) ||
        sale.employee_name?.toLowerCase().includes(q);
      if (!match) return false;
    }

    // Date range filter
    if (dateFrom && sale.sale_date < dateFrom) return false;
    if (dateTo && sale.sale_date > dateTo + "T23:59:59") return false;

    return true;
  }) || [];

  // Summary stats
  const totalBalance = filteredSales.reduce((sum, s) => sum + Math.max(0, Number(s.total_amount) - Number(s.amount_received || 0)), 0);
  const pendingCount = filteredSales.filter(s => getPaymentStatus(s) === "pending").length;
  const partialCount = filteredSales.filter(s => getPaymentStatus(s) === "partial").length;
  const paidCount = filteredSales.filter(s => getPaymentStatus(s) === "paid").length;

  const getStatusBadge = (sale: any) => {
    const status = getPaymentStatus(sale);
    if (status === "paid") return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
    if (status === "partial") return <Badge className="bg-warning/10 text-warning border-warning/20">Partial</Badge>;
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Pending</Badge>;
  };

  if (isLoading) {
    return (
      <div className="p-4 space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4">
        <div className="bg-muted/50 rounded-lg p-3 text-center">
          <p className="text-xs text-muted-foreground">Total Balance</p>
          <p className="text-lg font-bold text-destructive">₹{totalBalance.toLocaleString()}</p>
        </div>
        <div className="bg-destructive/10 rounded-lg p-3 text-center cursor-pointer" onClick={() => setStatusFilter("pending")}>
          <p className="text-xs text-muted-foreground">Pending</p>
          <p className="text-lg font-bold text-destructive">{pendingCount}</p>
        </div>
        <div className="bg-warning/10 rounded-lg p-3 text-center cursor-pointer" onClick={() => setStatusFilter("partial")}>
          <p className="text-xs text-muted-foreground">Partial</p>
          <p className="text-lg font-bold text-warning">{partialCount}</p>
        </div>
        <div className="bg-success/10 rounded-lg p-3 text-center cursor-pointer" onClick={() => setStatusFilter("paid")}>
          <p className="text-xs text-muted-foreground">Paid</p>
          <p className="text-lg font-bold text-success">{paidCount}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search Order ID, Customer, Employee..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-40">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="partial">Partial</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
        <Input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="w-full sm:w-40"
          placeholder="From"
        />
        <Input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="w-full sm:w-40"
          placeholder="To"
        />
        <PendingPaymentsUploadDialog />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">ORDER ID</TableHead>
              <TableHead className="font-semibold">CUSTOMER NAME</TableHead>
              <TableHead className="font-semibold hidden md:table-cell">CUST CODE</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">DATE</TableHead>
              <TableHead className="font-semibold hidden lg:table-cell">EMPLOYEE</TableHead>
              <TableHead className="font-semibold text-right">TOTAL</TableHead>
              <TableHead className="font-semibold text-right">RECEIVED</TableHead>
              <TableHead className="font-semibold text-right">BALANCE</TableHead>
              <TableHead className="font-semibold text-center">STATUS</TableHead>
              <TableHead className="font-semibold text-center">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredSales.map((sale) => {
              const balance = Math.max(0, Number(sale.total_amount) - Number(sale.amount_received || 0));
              return (
                <TableRow key={sale.order_id}>
                  <TableCell className="font-semibold text-primary">{sale.order_id}</TableCell>
                  <TableCell>{sale.customer_name || "-"}</TableCell>
                  <TableCell className="hidden md:table-cell text-primary font-medium">{sale.customer_code}</TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {format(new Date(sale.sale_date), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">{sale.employee_name}</TableCell>
                  <TableCell className="text-right">₹{Number(sale.total_amount).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-success">₹{Number(sale.amount_received || 0).toLocaleString()}</TableCell>
                  <TableCell className="text-right text-destructive font-semibold">₹{balance.toLocaleString()}</TableCell>
                  <TableCell className="text-center">{getStatusBadge(sale)}</TableCell>
                  <TableCell className="text-center">
                    {balance > 0 ? (
                      <Button
                        size="sm"
                        className="bg-primary hover:bg-primary/90"
                        onClick={() => setSelectedOrder(sale.order_id)}
                      >
                        Update
                      </Button>
                    ) : (
                      <span className="text-success text-xs font-medium">✓ Paid</span>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredSales.length === 0 && (
              <TableRow>
                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                  No sales found matching filters
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {selectedOrder && (
        <BalancePaymentDialog
          orderId={selectedOrder}
          open={!!selectedOrder}
          onOpenChange={(open) => !open && setSelectedOrder(null)}
        />
      )}
    </div>
  );
};
