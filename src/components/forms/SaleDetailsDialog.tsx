import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sale, SaleItem } from "@/hooks/useSales";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface SaleDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: Sale | null;
}

export const SaleDetailsDialog = ({
  open,
  onOpenChange,
  sale,
}: SaleDetailsDialogProps) => {
  // Fetch sale items
  const { data: items = [] } = useQuery({
    queryKey: ["sale-items", sale?.order_id],
    queryFn: async () => {
      if (!sale?.order_id) return [];
      const { data, error } = await supabase
        .from("sale_items")
        .select("*")
        .eq("order_id", sale.order_id);
      if (error) throw error;
      return data as SaleItem[];
    },
    enabled: !!sale?.order_id,
  });

  // Fetch payment history
  const { data: payments = [] } = useQuery({
    queryKey: ["payment-history", sale?.order_id],
    queryFn: async () => {
      if (!sale?.order_id) return [];
      const { data, error } = await supabase
        .from("payment_history")
        .select("*")
        .eq("order_id", sale.order_id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!sale?.order_id,
  });

  if (!sale) return null;

  const getStatusBadge = () => {
    if (Number(sale.balance_amount) === 0) {
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          Paid
        </Badge>
      );
    }
    if (Number(sale.amount_received) > 0) {
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          Partial
        </Badge>
      );
    }
    return (
      <Badge className="bg-destructive/10 text-destructive border-destructive/20">
        Pending
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-xl font-bold">
            Order {sale.order_id}
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Customer & Sale Info */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-secondary p-4 space-y-2">
              <h4 className="font-semibold text-foreground">Customer Details</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Code:</span>{" "}
                  {sale.customer_code}
                </p>
                {sale.customer_name && (
                  <p>
                    <span className="text-muted-foreground">Name:</span>{" "}
                    {sale.customer_name}
                  </p>
                )}
                {sale.company_name && (
                  <p>
                    <span className="text-muted-foreground">Company:</span>{" "}
                    {sale.company_name}
                  </p>
                )}
                {sale.customer_contact && (
                  <p>
                    <span className="text-muted-foreground">Contact:</span>{" "}
                    {sale.customer_contact}
                  </p>
                )}
              </div>
            </div>

            <div className="rounded-lg bg-secondary p-4 space-y-2">
              <h4 className="font-semibold text-foreground">Sale Info</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {format(new Date(sale.sale_date), "dd/MM/yyyy")}
                </p>
                <p>
                  <span className="text-muted-foreground">Employee:</span>{" "}
                  {sale.employee_name}
                </p>
                <p>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {sale.sale_type === "With" ? "With GST" : "Without GST"}
                </p>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-2">
            <h4 className="font-semibold text-foreground">Products</h4>
            <div className="rounded-lg border border-border overflow-hidden">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                      Product
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Qty
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Unit Price
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="px-4 py-2">{item.product_name}</td>
                      <td className="px-4 py-2 text-right">{item.quantity}</td>
                      <td className="px-4 py-2 text-right">
                        ₹{Number(item.unit_price).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        ₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-secondary p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span>₹{Number(sale.subtotal).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Courier Cost:</span>
                <span>₹{Number(sale.courier_cost).toLocaleString()}</span>
              </div>
              {Number(sale.gst_amount) > 0 && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%):</span>
                  <span>₹{Number(sale.gst_amount).toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total Amount:</span>
                <span>₹{Number(sale.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Received:</span>
                <span className="text-success">
                  ₹{Number(sale.amount_received).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Balance:</span>
                <span
                  className={
                    Number(sale.balance_amount) > 0
                      ? "text-destructive"
                      : "text-success"
                  }
                >
                  ₹{Number(sale.balance_amount).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment History */}
          {payments.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Payment History</h4>
              <div className="rounded-lg border border-border overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Account
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">
                        Reference
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase text-muted-foreground">
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.map((payment: any, i: number) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-4 py-2">
                          {format(new Date(payment.payment_date), "dd/MM/yyyy")}
                        </td>
                        <td className="px-4 py-2">{payment.account_received}</td>
                        <td className="px-4 py-2 text-muted-foreground">
                          {payment.payment_reference || "-"}
                        </td>
                        <td className="px-4 py-2 text-right font-medium text-success">
                          ₹{Number(payment.amount).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Remarks */}
          {sale.remarks && (
            <div className="space-y-2">
              <h4 className="font-semibold text-foreground">Remarks</h4>
              <p className="text-sm text-muted-foreground rounded-lg bg-secondary p-3">
                {sale.remarks}
              </p>
            </div>
          )}

          <div className="flex justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
