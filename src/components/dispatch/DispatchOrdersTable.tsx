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
import { Eye, Truck } from "lucide-react";
import { format } from "date-fns";
import type { Sale } from "@/hooks/useSales";

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

interface DispatchOrdersTableProps {
  orders: Sale[];
  shipments: Shipment[];
}

export const DispatchOrdersTable = ({ orders, shipments }: DispatchOrdersTableProps) => {
  // Calculate dispatch status for each order
  const getOrderDispatchInfo = (orderId: string) => {
    const orderShipments = shipments.filter(s => s.order_id === orderId);
    const dispatched = orderShipments.length;
    // For now, assume total items from sale items or default to dispatched count
    const totalItems = dispatched || 1;
    const remaining = Math.max(0, totalItems - dispatched);
    const status = remaining === 0 && dispatched > 0 ? "Completed" : "Pending";
    
    return { totalItems, dispatched, remaining, status };
  };

  const getStatusBadge = (status: string) => {
    if (status === "Completed") {
      return <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/20">Completed</Badge>;
    }
    return <Badge className="bg-warning/10 text-warning border-warning/20 hover:bg-warning/20">Pending</Badge>;
  };

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        No dispatch orders found
      </div>
    );
  }

  return (
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
                    {dispatchInfo.status === "Pending" ? (
                      <Button size="sm" className="gap-1 bg-primary hover:bg-primary/90">
                        <Truck className="h-3 w-3" />
                        Dispatch
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" className="gap-1 text-primary border-primary hover:bg-primary hover:text-white">
                        <Eye className="h-3 w-3" />
                        View
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
};
