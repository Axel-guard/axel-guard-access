import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload } from "lucide-react";
import { useSales } from "@/hooks/useSales";
import { format } from "date-fns";
import { PendingPaymentsUploadDialog } from "./PendingPaymentsUploadDialog";
import { BalancePaymentDialog } from "@/components/forms/BalancePaymentDialog";

export const PendingPaymentsTable = () => {
  const { data: sales, isLoading } = useSales();
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);

  // Filter for pending payments (balance > 0)
  const pendingPayments = sales?.filter(
    (sale) => Number(sale.balance_amount) > 0
  ) || [];

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
      <div className="flex justify-end p-4 border-b border-border">
        <PendingPaymentsUploadDialog />
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">ORDER ID</TableHead>
              <TableHead className="font-semibold">CUST CODE</TableHead>
              <TableHead className="font-semibold">DATE</TableHead>
              <TableHead className="font-semibold">CUSTOMER NAME</TableHead>
              <TableHead className="font-semibold">COMPANY NAME</TableHead>
              <TableHead className="font-semibold">EMPLOYEE</TableHead>
              <TableHead className="font-semibold">CONTACT</TableHead>
              <TableHead className="font-semibold text-right">TOTAL AMOUNT</TableHead>
              <TableHead className="font-semibold text-right">RECEIVED</TableHead>
              <TableHead className="font-semibold text-right">BALANCE</TableHead>
              <TableHead className="font-semibold text-center">ACTION</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pendingPayments.map((sale) => (
              <TableRow key={sale.order_id}>
                <TableCell className="font-semibold">{sale.order_id}</TableCell>
                <TableCell className="text-primary font-medium">
                  {sale.customer_code}
                </TableCell>
                <TableCell>
                  {format(new Date(sale.sale_date), "dd MMM yyyy")}
                </TableCell>
                <TableCell>{sale.customer_name || "-"}</TableCell>
                <TableCell>{sale.company_name || "-"}</TableCell>
                <TableCell>{sale.employee_name}</TableCell>
                <TableCell>{sale.customer_contact || "-"}</TableCell>
                <TableCell className="text-right">
                  ₹{Number(sale.total_amount).toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  ₹{Number(sale.amount_received).toLocaleString()}
                </TableCell>
                <TableCell className="text-right text-destructive font-semibold">
                  ₹{Number(sale.balance_amount).toLocaleString()}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90"
                    onClick={() => setSelectedOrder(sale.order_id)}
                  >
                    Update
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {pendingPayments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={11}
                  className="text-center py-8 text-muted-foreground"
                >
                  No pending payments found
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
