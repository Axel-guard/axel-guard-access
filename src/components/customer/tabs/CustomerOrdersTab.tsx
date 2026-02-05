import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useCustomerOrders, CustomerOrder } from "@/hooks/useCustomerDetails";
import { format } from "date-fns";
import { ShoppingCart, Eye, Package } from "lucide-react";
import { useState } from "react";

interface CustomerOrdersTabProps {
  customerCode: string;
}

const getStatusBadge = (received: number, total: number) => {
  if (received >= total) {
    return <Badge className="bg-green-100 text-green-700 border-0">Paid</Badge>;
  }
  if (received > 0) {
    return <Badge className="bg-yellow-100 text-yellow-700 border-0">Partial</Badge>;
  }
  return <Badge className="bg-red-100 text-red-700 border-0">Pending</Badge>;
};

const OrderDetailsDialog = ({ order }: { order: CustomerOrder }) => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Order #{order.order_id}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Date</p>
              <p className="font-medium">
                {format(new Date(order.sale_date), "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Sale Type</p>
              <p className="font-medium">{order.sale_type}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Employee</p>
              <p className="font-medium">{order.employee_name}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              {getStatusBadge(order.amount_received, order.total_amount)}
            </div>
          </div>

          {order.products && order.products.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Products</p>
              <div className="space-y-2">
                {order.products.map((product, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{product}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total Amount</span>
              <span className="font-medium">
                ₹{order.total_amount.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Received</span>
              <span className="font-medium text-green-600">
                ₹{order.amount_received.toLocaleString("en-IN")}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance</span>
              <span className="font-medium text-red-600">
                ₹{order.balance_amount.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const CustomerOrdersTab = ({ customerCode }: CustomerOrdersTabProps) => {
  const { data: orders, isLoading } = useCustomerOrders(customerCode);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <ShoppingCart className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No Orders Yet</h3>
          <p className="text-muted-foreground">
            This customer hasn't placed any orders yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Calculate summary
  const totalOrders = orders.length;
  const totalValue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalReceived = orders.reduce((sum, o) => sum + o.amount_received, 0);
  const totalBalance = orders.reduce((sum, o) => sum + o.balance_amount, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Order History</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-600 font-medium">Total Orders</p>
            <p className="text-2xl font-bold text-blue-700">{totalOrders}</p>
          </div>
          <div className="p-4 rounded-lg bg-purple-50 border border-purple-100">
            <p className="text-xs text-purple-600 font-medium">Total Value</p>
            <p className="text-2xl font-bold text-purple-700">
              ₹{totalValue.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-green-50 border border-green-100">
            <p className="text-xs text-green-600 font-medium">Received</p>
            <p className="text-2xl font-bold text-green-700">
              ₹{totalReceived.toLocaleString("en-IN")}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-red-50 border border-red-100">
            <p className="text-xs text-red-600 font-medium">Balance</p>
            <p className="text-2xl font-bold text-red-700">
              ₹{totalBalance.toLocaleString("en-IN")}
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Products</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Received</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => (
                <TableRow key={order.order_id}>
                  <TableCell className="font-medium">#{order.order_id}</TableCell>
                  <TableCell>
                    {format(new Date(order.sale_date), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <div className="max-w-[200px] truncate">
                      {order.products?.join(", ") || "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    ₹{order.total_amount.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right text-green-600">
                    ₹{order.amount_received.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    ₹{order.balance_amount.toLocaleString("en-IN")}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(order.amount_received, order.total_amount)}
                  </TableCell>
                  <TableCell>
                    <OrderDetailsDialog order={order} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
