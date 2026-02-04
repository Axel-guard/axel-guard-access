import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReportSummaryCard } from "./ReportSummaryCard";
import { useDispatchReport } from "@/hooks/useReportsData";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, Truck, CheckCircle, Clock, Search, Download, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SortField = "orderId" | "orderDate" | "totalItems" | "remaining";
type SortDirection = "asc" | "desc";

export const DispatchReportSection = () => {
  const { data, isLoading } = useDispatchReport();
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("orderDate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredAndSortedOrders = useMemo(() => {
    if (!data) return [];

    let filtered = data.dispatchOrders;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (order) =>
          order.orderId.toLowerCase().includes(query) ||
          order.customerName.toLowerCase().includes(query)
      );
    }

    // Apply date filter
    const now = new Date();
    if (dateFilter === "today") {
      const today = format(now, "yyyy-MM-dd");
      filtered = filtered.filter((order) => 
        format(new Date(order.orderDate), "yyyy-MM-dd") === today
      );
    } else if (dateFilter === "thisMonth") {
      const thisMonth = format(now, "yyyy-MM");
      filtered = filtered.filter((order) => 
        format(new Date(order.orderDate), "yyyy-MM") === thisMonth
      );
    } else if (dateFilter === "lastMonth") {
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const lastMonthStr = format(lastMonth, "yyyy-MM");
      filtered = filtered.filter((order) => 
        format(new Date(order.orderDate), "yyyy-MM") === lastMonthStr
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case "orderId":
          comparison = a.orderId.localeCompare(b.orderId);
          break;
        case "orderDate":
          comparison = new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
          break;
        case "totalItems":
          comparison = a.totalItems - b.totalItems;
          break;
        case "remaining":
          comparison = a.remaining - b.remaining;
          break;
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });

    return filtered;
  }, [data, searchQuery, dateFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const handleExport = () => {
    if (!filteredAndSortedOrders.length) return;

    const exportData = filteredAndSortedOrders.map((order) => ({
      "Order ID": order.orderId,
      "Customer Name": order.customerName,
      "Order Date": format(new Date(order.orderDate), "dd/MM/yyyy"),
      "Total Items": order.totalItems,
      "Dispatched": order.dispatched,
      "Remaining": order.remaining,
      "Status": order.status,
      "Last Dispatch": order.lastDispatchDate 
        ? format(new Date(order.lastDispatchDate), "dd/MM/yyyy") 
        : "-",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Dispatch Report");

    const fileName = `Dispatch_Report_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Truck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-foreground">Dispatch Summary Report</h2>
          <p className="text-sm text-muted-foreground">Order dispatch tracking and analytics</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <ReportSummaryCard
          title="Total Orders"
          value={summary.totalOrders}
          icon={ClipboardList}
          variant="primary"
        />
        <ReportSummaryCard
          title="Devices Dispatched"
          value={summary.devicesDispatched}
          icon={Truck}
          variant="info"
        />
        <ReportSummaryCard
          title="Dispatch Completed"
          value={summary.dispatchCompleted}
          icon={CheckCircle}
          variant="success"
        />
        <ReportSummaryCard
          title="Dispatch Pending"
          value={summary.dispatchPending}
          icon={Clock}
          variant="warning"
        />
      </div>

      {/* Dispatch Report Table */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-xl shadow-lg">
        <CardHeader className="flex-row items-center justify-between space-y-0 gap-4 pb-4 flex-wrap">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg">Dispatch Orders</CardTitle>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search order ID or customer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Filter by date" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="lastMonth">Last Month</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleExport} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead 
                    className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground"
                    onClick={() => handleSort("orderId")}
                  >
                    <div className="flex items-center gap-1">
                      Order ID
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Customer Name</TableHead>
                  <TableHead 
                    className="cursor-pointer text-xs font-semibold uppercase text-muted-foreground"
                    onClick={() => handleSort("orderDate")}
                  >
                    <div className="flex items-center gap-1">
                      Order Date
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead 
                    className="text-center cursor-pointer text-xs font-semibold uppercase text-muted-foreground"
                    onClick={() => handleSort("totalItems")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Total Items
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Dispatched</TableHead>
                  <TableHead 
                    className="text-center cursor-pointer text-xs font-semibold uppercase text-muted-foreground"
                    onClick={() => handleSort("remaining")}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Remaining
                      <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-center text-xs font-semibold uppercase text-muted-foreground">Status</TableHead>
                  <TableHead className="text-xs font-semibold uppercase text-muted-foreground">Last Dispatch</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAndSortedOrders.slice(0, 50).map((order) => (
                  <TableRow key={order.orderId} className="hover:bg-muted/50">
                    <TableCell>
                      <span className="font-medium text-primary cursor-pointer hover:underline">
                        {order.orderId}
                      </span>
                    </TableCell>
                  <TableCell className="font-medium">{order.customerName}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(order.orderDate), "d/M/yyyy")}
                    </TableCell>
                    <TableCell className="text-center font-semibold">{order.totalItems}</TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-semibold",
                        order.dispatched > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      )}>
                        {order.dispatched}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className={cn(
                        "font-semibold",
                        order.remaining > 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                      )}>
                        {order.remaining}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant={order.status === "Completed" ? "default" : "secondary"}
                        className={cn(
                          "font-medium",
                          order.status === "Completed"
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-yellow-500 hover:bg-yellow-600 text-white"
                        )}
                      >
                        {order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {order.lastDispatchDate
                        ? format(new Date(order.lastDispatchDate), "d/M/yyyy")
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {filteredAndSortedOrders.length > 50 && (
              <p className="mt-4 text-center text-sm text-muted-foreground">
                Showing 50 of {filteredAndSortedOrders.length} orders. Export to see all.
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
