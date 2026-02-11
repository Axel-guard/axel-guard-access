import { useState, useMemo } from "react";
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
  Calculator
} from "lucide-react";
import { useShipments, Shipment } from "@/hooks/useShipments";
import { useSales } from "@/hooks/useSales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { DispatchOrdersTable } from "@/components/dispatch/DispatchOrdersTable";
import { TrackingDetailsTable } from "@/components/dispatch/TrackingDetailsTable";
import { TrackingDetailsDialog } from "@/components/dispatch/TrackingDetailsDialog";
import { CourierCalculator } from "@/components/dispatch/CourierCalculator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";

const DispatchPage = () => {
  const queryClient = useQueryClient();
  const { data: shipments, isLoading: shipmentsLoading } = useShipments();
  const { data: sales, isLoading: salesLoading } = useSales();

  // Fetch sale_items for all current month orders to get total quantities
  const { data: allSaleItems, isLoading: saleItemsLoading } = useQuery({
    queryKey: ["dispatch-sale-items"],
    queryFn: async () => {
      if (!sales || sales.length === 0) return [];
      const orderIds = sales.map(s => s.order_id);
      const { data, error } = await supabase
        .from("sale_items")
        .select("*")
        .in("order_id", orderIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sales && sales.length > 0,
  });

  // Fetch dispatched inventory items for current month orders
  const { data: dispatchedInventory, isLoading: inventoryLoading } = useQuery({
    queryKey: ["dispatch-inventory-status"],
    queryFn: async () => {
      if (!sales || sales.length === 0) return [];
      const orderIds = sales.map(s => s.order_id);
      const { data, error } = await supabase
        .from("inventory")
        .select("order_id")
        .eq("status", "Dispatched")
        .in("order_id", orderIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!sales && sales.length > 0,
  });
  
  const [activeTab, setActiveTab] = useState("orders");
  const [orderIdSearch, setOrderIdSearch] = useState("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [trackingSearch, setTrackingSearch] = useState("");
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);
  const [editShipment, setEditShipment] = useState<Shipment | null>(null);

  // Calculate dispatch order stats
  const dispatchStats = useMemo(() => {
    if (!sales) return { completed: 0, pending: 0 };
    
    // For now, assume orders with shipments are completed
    const orderIdsWithShipments = new Set(shipments?.map(s => s.order_id) || []);
    const completed = sales.filter(s => orderIdsWithShipments.has(s.order_id)).length;
    const pending = sales.length - completed;
    
    return { completed, pending };
  }, [sales, shipments]);

  // Filter dispatch orders (sales data)
  const filteredOrders = useMemo(() => {
    if (!sales) return [];
    
    return sales.filter(sale => {
      const matchesOrderId = orderIdSearch === "" || 
        sale.order_id.toLowerCase().includes(orderIdSearch.toLowerCase());
      const matchesCustomer = customerSearch === "" || 
        (sale.customer_name?.toLowerCase() || "").includes(customerSearch.toLowerCase()) ||
        (sale.customer_contact?.toLowerCase() || "").includes(customerSearch.toLowerCase());
      
      return matchesOrderId && matchesCustomer;
    });
  }, [sales, orderIdSearch, customerSearch]);

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
            {dispatchStats.completed} Orders Completed | {dispatchStats.pending} Orders Pending Dispatch
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
          {/* Search Bar */}
          <Card className="shadow-card">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <Input
                  placeholder="Search by Order ID..."
                  value={orderIdSearch}
                  onChange={(e) => setOrderIdSearch(e.target.value)}
                  className="flex-1"
                />
                <Input
                  placeholder="Search by Customer Name/Mobile..."
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.target.value)}
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
              <CardTitle className="flex items-center gap-2 text-base font-semibold">
                <Truck className="h-5 w-5" />
                Dispatch Orders
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <DispatchOrdersTable 
                orders={filteredOrders} 
                shipments={shipments || []}
                saleItems={allSaleItems || []}
                dispatchedInventory={dispatchedInventory || []}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tracking Details Tab */}
        <TabsContent value="tracking" className="space-y-4">
          {/* Tracking Records Report Header */}
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

          {/* Search and Filter */}
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

          {/* Tracking Details Table */}
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

      {/* Tracking Details Dialog */}
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

