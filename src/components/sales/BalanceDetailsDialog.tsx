import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { IndianRupee, Wallet, History } from "lucide-react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface BalanceDetailsDialogProps {
  sale: {
    order_id: string;
    total_amount: number;
    amount_received?: number | null;
    balance_amount?: number | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BalanceDetailsDialog = ({ sale, open, onOpenChange }: BalanceDetailsDialogProps) => {
  // Fetch payment history for this order
  const { data: paymentHistory, isLoading } = useQuery({
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
    enabled: open && !!sale?.order_id,
  });

  if (!sale) return null;

  const finalAmount = Number(sale.total_amount) || 0;
  const amountReceived = Number(sale.amount_received) || 0;
  const balance = Math.max(0, finalAmount - amountReceived); // Never show negative

  const getStatusBadge = () => {
    if (amountReceived >= finalAmount && finalAmount > 0) {
      return <Badge className="bg-success/10 text-success border-success/20">Paid</Badge>;
    }
    if (amountReceived === 0) {
      return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Pending</Badge>;
    }
    return <Badge className="bg-warning/10 text-warning border-warning/20">Partial</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Balance Details - {sale.order_id}
            </span>
            {getStatusBadge()}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Payment Summary */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Final Amount</p>
              <p className="text-lg font-bold flex items-center justify-center gap-1">
                <IndianRupee className="h-4 w-4" />
                {finalAmount.toLocaleString()}
              </p>
            </div>
            <div className="bg-success/10 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Received</p>
              <p className="text-lg font-bold text-success flex items-center justify-center gap-1">
                <IndianRupee className="h-4 w-4" />
                {amountReceived.toLocaleString()}
              </p>
            </div>
            <div className="bg-destructive/10 rounded-lg p-4 text-center">
              <p className="text-xs text-muted-foreground mb-1">Balance</p>
              <p className="text-lg font-bold text-destructive flex items-center justify-center gap-1">
                <IndianRupee className="h-4 w-4" />
                {balance.toLocaleString()}
              </p>
            </div>
          </div>

          <Separator />

          {/* Payment History */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
              <History className="h-4 w-4" />
              Payment History
            </h4>

            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : paymentHistory && paymentHistory.length > 0 ? (
              <div className="max-h-48 overflow-y-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs text-right">Amount</TableHead>
                      <TableHead className="text-xs">Account</TableHead>
                      <TableHead className="text-xs">Reference</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell className="text-xs">
                          {payment.payment_date
                            ? format(new Date(payment.payment_date), "dd/MM/yy")
                            : "-"}
                        </TableCell>
                        <TableCell className="text-xs text-right font-medium text-success">
                          ₹{Number(payment.amount).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-xs">
                          {payment.account_received || "-"}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[80px]">
                          {payment.payment_reference || "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm bg-muted/30 rounded-lg">
                No payment history found
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
