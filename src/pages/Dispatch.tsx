import { useState, useMemo, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Truck, 
  Search, 
  Package, 
  FileSpreadsheet, 
  Plus, 
  X,
  Calculator,
  CheckCircle,
  Clock,
  Filter
} from "lucide-react";
import { useShipments, Shipment } from "@/hooks/useShipments";
import { useAllDispatchSales } from "@/hooks/useAllDispatchSales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatchOrdersTable } from "@/components/dispatch/DispatchOrdersTable";
import { TrackingDetailsTable } from "@/components/dispatch/TrackingDetailsTable";
import { TrackingDetailsDialog } from "@/components/dispatch/TrackingDetailsDialog";
import { CourierCalculator } from "@/components/dispatch/CourierCalculator";
import { DispatchDateFilter } from "@/components/dispatch/DispatchDateFilter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { useQueryClient } from "@tanstack/react-query";
import { startOfDay, startOfMonth, startOfQuarter, startOfYear, subMonths, endOfMonth } from "date-fns";

const ITEMS_PER_PAGE = 50;

const DispatchPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();
  const { data: allSales, isLoading: salesLoading } = useAllDispatchSales();

  // Combine all order IDs for fetching related data
  const allOrderIds = useMemo(() => {
    return (allSales || []).map(s => s.order_id);
  }, [allSales]);

  // Fetch sale_items for all dispatch orders
  const { data: allSaleItems, isLoading: saleItemsLoading } = useQuery({
    queryKey: ["dispatch-sale-items", allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) {
        chunks.push(allOrderIds.slice(i, i + 500));
      }
      const results = await Promise.all(chunks.map(async chunk => {
        const { data, error } = await supabase
          .from("sale_items")
          .select("*")
          .in("order_id", chunk);
        if (error) throw error;
        return data || [];
      }));
      return results.flat();
    },
    enabled: allOrderIds.length > 0,
  });

  // Fetch dispatched inventory items for all dispatch orders
  const { data: dispatchedInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["dispatch-inventory-status", allOrderIds.length],
    queryFn: async () => {
      if (allOrderIds.length === 0) return [];
      const chunks: string[][] = [];
      for (let i = 0; i < allOrderIds.length; i += 500) {
        chunks.push(allOrderIds.slice(i, i + 500));
      }
      const results = await Promise.all(chunks.map(async chunk => {
        const { data, error } = await supabase
          .from("inventory")
          .select("order_id")
          .eq("status", "Dispatched")
          .in("order_id", chunk);
        if (error) throw error;
        return data || [];
      }));
      return results.flat();
    },
    enabled: allOrderIds.length > 0,
  });
  
  const [activeTab, setActiveTab] = useState("orders");
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [editShipment, setEditShipment] = useState<Shipment | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  // Read status filter and date filter from URL params
  const statusFilter = searchParams.get("status") || "all";
  const dateFilter = searchParams.get("period") || "all-time";

  const setStatusFilter = useCallback((filter: string) => {
    if (filter === "all") {
      searchParams.delete("status");
    } else {
      searchParams.set("status", filter);
    }
    setSearchParams(searchParams, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams]);

  const setDateFilter = useCallback((filter: string) => {
    if (filter === "all-time") {
      searchParams.delete("period");
    } else {
      searchParams.set("period", filter);
    }
    setSearchParams(searchParams, { replace: true });
    setCurrentPage(1);
  }, [searchParams, setSearchParams]);

  // Fetch product types from DB for service detection
  const { data: productTypesData } = useQuery({
    queryKey: ["product-types-map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("product_name, product_type, category");
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach(p => {
        const isSkipDispatch = p.product_name === "MDVR Connector";
        map[p.product_name] = isSkipDispatch ? "service" : (p.product_type || "physical");
      });
      return map;
    },
  });

  const isServiceProduct = useCallback((productName: string): boolean => {
    return (productTypesData || {})[productName] === "service";
  }, [productTypesData]);

  // Helper to compute dispatch status for an order
  const getOrderStatus = useCallback((orderId: string) => {
    const orderSaleItems = (allSaleItems || []).filter(item => item.order_id === orderId);
    const totalItems = orderSaleItems.reduce((sum, item) => sum + Number(item.quantity), 0);
    const physicalDispatched = (dispatchedInventory || []).filter(item => item.order_id === orderId).length;
    
    const orderHasShipment = (shipments || []).some(s => s.order_id === orderId);
    const serviceDispatched = orderHasShipment
      ? orderSaleItems
          .filter(item => isServiceProduct(item.product_name))
          .reduce((sum, item) => sum + Number(item.quantity), 0)
      : 0;
    
    const dispatched = physicalDispatched + serviceDispatched;
    
    if (dispatched === 0) return "Pending";
    if (dispatched < totalItems) return "Partially Dispatched";
    if (dispatched >= totalItems && totalItems > 0) return "Completed";
    return "Pending";
  }, [allSaleItems, dispatchedInventory, shipments, isServiceProduct]);

  // Get date range for filtering
  const getDateRange = useCallback((filter: string): { start: Date | null; end: Date | null } => {
    const now = new Date();
    switch (filter) {
      case "today":
        return { start: startOfDay(now), end: null };
      case "this-month":
        return { start: startOfMonth(now), end: null };
      case "last-month": {
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      }
      case "this-quarter":
        return { start: startOfQuarter(now), end: null };
      case "this-year":
        return { start: startOfYear(now), end: null };
      default:
        return { start: null, end: null };
    }
  }, []);

  // Filter dispatch orders with status + date + search filters
  const filteredOrders = useMemo(() => {
    if (!allSales?.length) return [];
    
    const { start, end } = getDateRange(dateFilter);
    
    return allSales.filter(sale => {
      const matchesOrderId = orderIdSearch === "" || 
        sale.order_id.toLowerCase().includes(orderIdSearch.toLowerCase());
      const matchesCustomer = customerSearch === "" || 
        (sale.customer_name?.toLowerCase() || "").includes(customerSearch.toLowerCase()) ||
        (sale.customer_contact?.toLowerCase() || "").includes(customerSearch.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === "completed") {
        matchesStatus = getOrderStatus(sale.order_id) === "Completed";
      } else if (statusFilter === "pending") {
        const status = getOrderStatus(sale.order_id);
        matchesStatus = status === "Pending" || status === "Partially Dispatched";
      }

      let matchesDate = true;
      if (start) {
        const saleDate = new Date(sale.sale_date);
        matchesDate = saleDate >= start;
        if (end) {
          matchesDate = matchesDate && saleDate <= end;
        }
      }
      
      return matchesOrderId && matchesCustomer && matchesStatus && matchesDate;
    });
  }, [allSales, orderIdSearch, customerSearch, statusFilter, dateFilter, getOrderStatus, getDateRange]);

  // Calculate dispatch order stats from filtered (by date) orders
  const dispatchStats = useMemo(() => {
    if (!filteredOrders.length) return { completed: 0, pending: 0, total: 0 };
    
    let completed = 0;
    let pending = 0;
    filteredOrders.forEach(s => {
      const status = getOrderStatus(s.order_id);
      if (status === "Completed") completed++;
      else pending++;
    });
    
    return { completed, pending, total: filteredOrders.length };
  }, [filteredOrders, getOrderStatus]);

  // Pagination
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredOrders.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredOrders, currentPage]);

  // Generate page numbers for pagination
  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push("ellipsis");
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (currentPage < totalPages - 2) pages.push("ellipsis");
      pages.push(totalPages);
    }
    return pages;
  };

  // Filter tracking details (shipments data)
  const filteredShipments = useMemo(() => {
    if (!shipments) return [];
    
    return shipments.filter(shipment => {
      const search = trackingSearch.toLowerCase();
      return trackingSearch === "" ||
        (shipment.order_id?.toLowerCase() || "").includes(search) ||
        (shipment.courier_partner?.toLowerCase() || "").includes(search) ||
        (shipment.tracking_id?.toLowerCase() || "").includes(search);
    });
  }, [shipments, trackingSearch]);

  const handleClearOrderSearch = () => {
    setOrderIdSearch("");
    setCustomerSearch("");
    setStatusFilter("all");
    setDateFilter("all-time");
    setCurrentPage(1);
  };

  const handleTrackingSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["shipments"] });
    setEditShipment(null);
  };

  const handleEditShipment = (shipment: Shipment) => {
    setEditShipment(shipment);
    setTrackingDialogOpen(true);
  };

  const handleOpenTrackingDialog = () => {
    setEditShipment(null);
    setTrackingDialogOpen(true);
  };

  const isLoading = shipmentsLoading || salesLoading || saleItemsLoading || inventoryLoading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dispatch Management</h1>
          <p className="text-muted-foreground">
            {dispatchStats.completed} Completed | {dispatchStats.pending} Pending | {filteredOrders.length} Total Orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <FileSpreadsheet className="h-4 w-4" />
            Export Excel
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="gap-2 bg-success text-white hover:bg-success/90">
                <Plus className="h-4 w-4" />
                Create
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleOpenTrackingDialog}>
                <Truck className="h-4 w-4 mr-2" />
                Add Tracking Details
              </DropdownMenuItem>
              <DropdownMenuItem>Bulk Dispatch</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger 
            value="orders" 
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Package className="h-4 w-4" />
            Dispatch Orders
          </TabsTrigger>
          <TabsTrigger 
            value="tracking"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Truck className="h-4 w-4" />
            Tracking Details
          </TabsTrigger>
          <TabsTrigger 
            value="calculator"
            className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Calculator className="h-4 w-4" />
            Courier Calculator
          </TabsTrigger>
        </TabsList>

        {/* Dispatch Orders Tab */}
        <TabsContent value="orders" className="space-y-4">
          {/* Status Filter Chips + Date Filter */}
          <div className="flex items-center gap-2 flex-wrap justify-between">
            <div className="flex items-center gap-2 flex-wrap">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Button
                size="sm"
                variant={statusFilter === "all" ? "default" : "outline"}
                className={cn(
                  "gap-1.5 transition-all duration-200",
                  statusFilter === "all" && "shadow-md"
                )}
                onClick={() => setStatusFilter("all")}
              >
                <Truck className="h-3.5 w-3.5" />
                All ({dispatchStats.total})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "completed" ? "default" : "outline"}
                className={cn(
                  "gap-1.5 transition-all duration-200",
                  statusFilter === "completed" && "bg-success hover:bg-success/90 shadow-md"
                )}
                onClick={() => setStatusFilter("completed")}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Completed ({dispatchStats.completed})
              </Button>
              <Button
                size="sm"
                variant={statusFilter === "pending" ? "default" : "outline"}
                className={cn(
                  "gap-1.5 transition-all duration-200",
                  statusFilter === "pending" && "bg-warning hover:bg-warning/90 shadow-md"
                )}
                onClick={() => setStatusFilter("pending")}
              >
                <Clock className="h-3.5 w-3.5" />
                Pending ({dispatchStats.pending})
              </Button>
            </div>
            <DispatchDateFilter value={dateFilter} onValueChange={setDateFilter} />
          </div>

          {/* Search Bar */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Input
                  placeholder="Search by Order ID..."
                  value={orderIdSearch}
                  onChange={(e) => { setOrderIdSearch(e.target.value); setCurrentPage(1); }}
                  className="flex-1"
                />
                <Input
                  placeholder="Search by Customer Name/Mobile..."
                  value={customerSearch}
                  onChange={(e) => { setCustomerSearch(e.target.value); setCurrentPage(1); }}
                  className="flex-1"
                />
                <div className="flex gap-2">
                  <Button className="gap-2 bg-primary hover:bg-primary/90">
                    <Search className="h-4 w-4" />
                    Search
                  </Button>
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleClearOrderSearch}
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Dispatch Orders Table */}
          <Card className="shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-base font-semibold">
                <span className="flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Dispatch Orders
                </span>
                <span className="text-sm font-normal text-muted-foreground">
                  Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <DispatchOrdersTable 
                orders={paginatedOrders} 
                shipments={shipments || []}
                saleItems={allSaleItems || []}
                dispatchedInventory={dispatchedInventory || []}
                pageOffset={(currentPage - 1) * ITEMS_PER_PAGE}
              />
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    className={cn(currentPage === 1 && "pointer-events-none opacity-50", "cursor-pointer")}
                  />
                </PaginationItem>
                {getPageNumbers().map((page, i) =>
                  page === "ellipsis" ? (
                    <PaginationItem key={`ellipsis-${i}`}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  ) : (
                    <PaginationItem key={page}>
                      <PaginationLink
                        isActive={currentPage === page}
                        onClick={() => setCurrentPage(page as number)}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  )
                )}
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    className={cn(currentPage === totalPages && "pointer-events-none opacity-50", "cursor-pointer")}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </TabsContent>

        {/* Tracking Details Tab */}
        <TabsContent value="tracking" className="space-y-4">
          <div className="bg-gradient-to-r from-primary to-primary/80 rounded-lg p-6 text-primary-foreground">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5" />
                  Tracking Records Report
                </h2>
                <p className="text-white/80 text-sm mt-1">
                  All tracking records with invoice pricing
                </p>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="secondary" 
                  className="gap-2"
                  onClick={handleOpenTrackingDialog}
                >
                  <Plus className="h-4 w-4" />
                  Add Tracking
                </Button>
                <Button variant="secondary" className="gap-2">
                  <FileSpreadsheet className="h-4 w-4" />
                  Download Excel
                </Button>
              </div>
            </div>
          </div>

          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by Order ID, Courier, Tracking ID..."
                    value={trackingSearch}
                    onChange={(e) => setTrackingSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Button variant="outline" className="gap-2">
                  <Package className="h-4 w-4" />
                  All Months
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardContent className="px-0 py-0">
              <TrackingDetailsTable 
                shipments={filteredShipments} 
                onEdit={handleEditShipment}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Courier Calculator Tab */}
        <TabsContent value="calculator" className="space-y-4">
          <CourierCalculator />
        </TabsContent>
      </Tabs>

      <TrackingDetailsDialog
        open={trackingDialogOpen}
        onOpenChange={setTrackingDialogOpen}
        onSuccess={handleTrackingSuccess}
        editData={editShipment}
      />
    </div>
  );
};

export default DispatchPage;
