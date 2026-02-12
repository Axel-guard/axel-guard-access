import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Eye, Truck, Trash2 } from "lucide-react";
import { format } from "date-fns";
import type { Sale, SaleItem } from "@/hooks/useSales";
import { CreateDispatchDialog } from "./CreateDispatchDialog";
import { ViewDispatchDialog } from "./ViewDispatchDialog";
import { DeleteDispatchDialog } from "./DeleteDispatchDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface Shipment {
  id: string;
  order_id: string | null;
  shipment_type: string;
  courier_partner: string | null;
  shipping_mode: string | null;
  tracking_id: string | null;
  weight_kg: number | null;
  shipping_cost: number | null;
  created_at: string | null;
}

interface DispatchedInventoryItem {
  order_id: string | null;
}

interface DispatchOrdersTableProps {
  orders: Sale[];
  shipments: Shipment[];
  saleItems: SaleItem[];
  dispatchedInventory: DispatchedInventoryItem[];
}

export const DispatchOrdersTable = ({ orders, shipments, saleItems, dispatchedInventory }: DispatchOrdersTableProps) => {
  const { isAdmin, isMasterAdmin } = useAuth();
  const [dispatchDialogOpen, setDispatchDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Sale | null>(null);
  const [orderItems, setOrderItems] = useState<SaleItem[]>([]);

  const canDelete = isAdmin || isMasterAdmin;

  // Service products that don't require physical inventory
  const SERVICE_PRODUCTS = ["Server Charges", "Cloud Charges", "SIM Charges"];
  const isServiceProduct = (productName: string): boolean => {
    const lowerName = productName.toLowerCase();
    return SERVICE_PRODUCTS.some(sp => 
      lowerName.includes(sp.toLowerCase().replace(" charges", "").trim()) ||
      lowerName.includes(sp.toLowerCase())
    );
  };

  // Calculate dispatch status for each order
  const getOrderDispatchInfo = (orderId: string) => {
    const orderSaleItems = saleItems.filter(item => item.order_id === orderId);
    const totalItems = orderSaleItems.reduce((sum, item) => sum + Number(item.quantity), 0);

    const physicalDispatched = dispatchedInventory.filter(
      item => item.order_id === orderId
    ).length;

    const orderHasShipment = shipments.some(s => s.order_id === orderId);
    const serviceDispatched = orderHasShipment
      ? orderSaleItems
          .filter(item => isServiceProduct(item.product_name))
          .reduce((sum, item) => sum + Number(item.quantity), 0)
      : 0;

    const dispatched = physicalDispatched + serviceDispatched;
    const remaining = Math.max(0, totalItems - dispatched);

    let status = "Pending";
    if (dispatched === 0) status = "Pending";
    else if (dispatched < totalItems) status = "Partially Dispatched";
    else if (dispatched >= totalItems && totalItems > 0) status = "Completed";
    
    return { totalItems, dispatched, remaining, status };
  };

  const getStatusBadge = (status: string) => {
    if (status === "Completed") {
      return <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">Completed</Badge>;
    }
    if (status === "Partially Dispatched") {
      return <Badge className="bg-info/10 text-info border-info/20 hover:bg-info/20">Partially Dispatched</Badge>;
    }
    return <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">Pending</Badge>;
  };

  const handleDispatchClick = async (order: Sale) => {
    const { data: items, error } = await supabase
      .from("sale_items")
      .select("*")
      .eq("order_id", order.order_id);

    if (error) {
      console.error("Error fetching sale items:", error);
      return;
    }

    setSelectedOrder(order);
    setOrderItems(items || []);
    setDispatchDialogOpen(true);
  };

  const handleViewClick = (order: Sale) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  const handleDeleteClick = (order: Sale) => {
    if (!canDelete) {
      toast.error("Permission denied", {
        description: "Only Admin or Master Admin can delete dispatches",
      });
      return;
    }
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No dispatch orders found
      </div>
    );
  }

  return (
    <>
      <ScrollArea className="w-full">
        <div className="min-w-[1100px]">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent bg-muted/30">
                <TableHead className="font-semibold text-foreground">S.NO</TableHead>
                <TableHead className="font-semibold text-foreground">ORDER DATE</TableHead>
                <TableHead className="font-semibold text-foreground">ORDER ID</TableHead>
                <TableHead className="font-semibold text-foreground">CUSTOMER</TableHead>
                <TableHead className="font-semibold text-foreground">COMPANY</TableHead>
                <TableHead className="font-semibold text-foreground text-center">TOTAL ITEMS</TableHead>
                <TableHead className="font-semibold text-foreground text-center">DISPATCHED</TableHead>
                <TableHead className="font-semibold text-foreground text-center">REMAINING</TableHead>
                <TableHead className="font-semibold text-foreground text-center">STATUS</TableHead>
                <TableHead className="font-semibold text-foreground text-center">ACTIONS</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order, index) => {
                const dispatchInfo = getOrderDispatchInfo(order.order_id);
                const hasDispatches = dispatchInfo.dispatched > 0;
                
                return (
                  <TableRow key={order.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">
                      {index + 1}
                    </TableCell>
                    <TableCell>
                      {order.sale_date 
                        ? format(new Date(order.sale_date), "dd/MM/yyyy")
                        : "-"
                      }
                    </TableCell>
                    <TableCell className="font-semibold text-primary">
                      {order.order_id.replace("ORD", "")}
                    </TableCell>
                    <TableCell className="font-medium">
                      {order.customer_name || "-"}
                    </TableCell>
                    <TableCell className="text-primary">
                      {order.company_name || "-"}
                    </TableCell>
                    <TableCell className="text-center">
                      {dispatchInfo.totalItems}
                    </TableCell>
                    <TableCell className="text-center text-success font-medium">
                      {dispatchInfo.dispatched}
                    </TableCell>
                    <TableCell className="text-center text-warning font-medium">
                      {dispatchInfo.remaining}
                    </TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(dispatchInfo.status)}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* Show Dispatch button if there are remaining items */}
                        {dispatchInfo.remaining > 0 && (
                          <Button 
                            size="sm" 
                            className="gap-1 bg-primary hover:bg-primary/90"
                            onClick={() => handleDispatchClick(order)}
                          >
                            <Truck className="h-3 w-3" />
                            Dispatch
                          </Button>
                        )}
                        {/* Show View button if any dispatches have been done */}
                        {hasDispatches && (
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="gap-1 text-primary border-primary hover:bg-primary hover:text-white"
                            onClick={() => handleViewClick(order)}
                          >
                            <Eye className="h-3 w-3" />
                            View
                          </Button>
                        )}
                        {/* Show Delete for admins if dispatches exist */}
                        {hasDispatches && canDelete && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive border-destructive hover:bg-destructive hover:text-white"
                            onClick={() => handleDeleteClick(order)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      <CreateDispatchDialog
        open={dispatchDialogOpen}
        onOpenChange={setDispatchDialogOpen}
        order={selectedOrder}
        orderItems={orderItems}
      />

      <ViewDispatchDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        order={selectedOrder}
        shipments={shipments}
      />

      <DeleteDispatchDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        order={selectedOrder}
        shipments={shipments}
      />
    </>
  );
};
