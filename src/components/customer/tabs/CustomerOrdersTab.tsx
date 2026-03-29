import { useState } from "react";
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
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useCustomerOrders, CustomerOrder, CustomerProfile } from "@/hooks/useCustomerDetails";
import { BalancePaymentDialog } from "@/components/forms/BalancePaymentDialog";
import { format } from "date-fns";
import { ShoppingCart, Eye, Package, MoreVertical, IndianRupee } from "lucide-react";

interface CustomerOrdersTabProps {
  customerCode: string;
  customer?: CustomerProfile;
}

const getStatusBadge = (received: number, total: number) => {
  if (received >= total) return <Badge className="bg-green-100 text-green-700 border-0">Paid</Badge>;
  if (received > 0)       return <Badge className="bg-yellow-100 text-yellow-700 border-0">Partial</Badge>;
  return                         <Badge className="bg-red-100 text-red-700 border-0">Pending</Badge>;
};

/* ── Order details view dialog ── */
const OrderDetailsContent = ({ order }: { order: CustomerOrder }) => (
  <div className="space-y-4">
    <div className="grid grid-cols-2 gap-4 text-sm">
      <div>
        <p className="text-muted-foreground">Date</p>
        <p className="font-medium">{format(new Date(order.sale_date), "dd MMM yyyy")}</p>
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
            <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
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
        <span className="font-medium">₹{order.total_amount.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">Received</span>
        <span className="font-medium text-green-600">₹{order.amount_received.toLocaleString("en-IN")}</span>
      </div>
      <div className="flex justify-between text-sm font-semibold">
        <span>Balance</span>
        <span className="text-red-600">₹{order.balance_amount.toLocaleString("en-IN")}</span>
      </div>
    </div>
  </div>
);

export const CustomerOrdersTab = ({ customerCode, customer }: CustomerOrdersTabProps) => {
  const { data: orders, isLoading } = useCustomerOrders(customerCode);

  const [detailOrder, setDetailOrder] = useState<CustomerOrder | null>(null);
  const [paymentOrder, setPaymentOrder] = useState<CustomerOrder | null>(null);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}
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
          <p className="text-muted-foreground">This customer hasn't placed any orders yet.</p>
        </CardContent>
      </Card>
    );
  }

  const totalOrders   = orders.length;
  const totalValue    = orders.reduce((s, o) => s + o.total_amount, 0);
  const totalReceived = orders.reduce((s, o) => s + o.amount_received, 0);
  const totalBalance  = orders.reduce((s, o) => s + o.balance_amount, 0);

  // Build SaleData object for BalancePaymentDialog
  const buildSaleData = (order: CustomerOrder) => ({
    order_id: order.order_id,
    customer_name: customer?.customer_name,
    customer_code: customerCode,
    customer_contact: customer?.mobile_number,
    customer_email: customer?.email,
    sale_date: order.sale_date,
    employee_name: order.employee_name,
    total_amount: order.total_amount,
    amount_received: order.amount_received,
    balance_amount: order.balance_amount,
  });

  return (
    <>
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
              <p className="text-2xl font-bold text-purple-700">₹{totalValue.toLocaleString("en-IN")}</p>
            </div>
            <div className="p-4 rounded-lg bg-green-50 border border-green-100">
              <p className="text-xs text-green-600 font-medium">Received</p>
              <p className="text-2xl font-bold text-green-700">₹{totalReceived.toLocaleString("en-IN")}</p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 border border-red-100">
              <p className="text-xs text-red-600 font-medium">Balance</p>
              <p className="text-2xl font-bold text-red-700">₹{totalBalance.toLocaleString("en-IN")}</p>
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
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order) => (
                  <TableRow key={order.order_id} className="group hover:bg-muted/30">
                    <TableCell className="font-medium">#{order.order_id}</TableCell>
                    <TableCell>{format(new Date(order.sale_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>
                      <div className="max-w-[200px] truncate text-sm">
                        {order.products?.join(", ") || "-"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{order.total_amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₹{order.amount_received.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell className="text-right text-red-600 font-medium">
                      ₹{order.balance_amount.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.amount_received, order.total_amount)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => setDetailOrder(order)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {order.balance_amount > 0 && (
                            <DropdownMenuItem onClick={() => setPaymentOrder(order)}>
                              <IndianRupee className="mr-2 h-4 w-4 text-emerald-600" />
                              Add Payment
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={!!detailOrder} onOpenChange={(o) => { if (!o) setDetailOrder(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Order #{detailOrder?.order_id}</DialogTitle>
          </DialogHeader>
          {detailOrder && <OrderDetailsContent order={detailOrder} />}
        </DialogContent>
      </Dialog>

      {/* Balance Payment Dialog */}
      {paymentOrder && (
        <BalancePaymentDialog
          open={!!paymentOrder}
          onOpenChange={(o) => { if (!o) setPaymentOrder(null); }}
          sale={buildSaleData(paymentOrder)}
        />
      )}
    </>
  );
};
