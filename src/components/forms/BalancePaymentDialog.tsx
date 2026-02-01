import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useUpdateBalancePayment, useSales } from "@/hooks/useSales";
import { Search } from "lucide-react";

interface BalancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId?: string;
}

const ACCOUNTS = ["IDFC4828", "IDFC7455", "Canara", "Cash"];

export const BalancePaymentDialog = ({
  open,
  onOpenChange,
  orderId: initialOrderId,
}: BalancePaymentDialogProps) => {
  const { data: sales = [] } = useSales();
  const updatePayment = useUpdateBalancePayment();

  const [orderId, setOrderId] = useState(initialOrderId || "");
  const [selectedSale, setSelectedSale] = useState<typeof sales[0] | null>(null);
  const [paymentDate, setPaymentDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [amount, setAmount] = useState(0);
  const [accountReceived, setAccountReceived] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  // Auto-search when initialOrderId is provided
  useEffect(() => {
    if (initialOrderId && sales.length > 0) {
      const sale = sales.find(
        (s) => s.order_id.toLowerCase() === initialOrderId.toLowerCase()
      );
      if (sale) {
        setOrderId(initialOrderId);
        setSelectedSale(sale);
        setAmount(Number(sale.balance_amount));
      }
    }
  }, [initialOrderId, sales]);

  const handleSearch = () => {
    const sale = sales.find(
      (s) =>
        s.order_id.toLowerCase() === orderId.toLowerCase() ||
        s.order_id.toLowerCase().includes(orderId.toLowerCase())
    );
    setSelectedSale(sale || null);
    if (sale) {
      setAmount(Number(sale.balance_amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedSale || amount <= 0) return;

    await updatePayment.mutateAsync({
      order_id: selectedSale.order_id,
      payment_date: new Date(paymentDate).toISOString(),
      amount,
      account_received: accountReceived,
      payment_reference: paymentReference,
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setOrderId("");
    setSelectedSale(null);
    setPaymentDate(new Date().toISOString().split("T")[0]);
    setAmount(0);
    setAccountReceived("Cash");
    setPaymentReference("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Balance Payment Update
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Order Search */}
          <div className="space-y-2">
            <Label htmlFor="orderId">Order ID</Label>
            <div className="flex gap-2">
              <Input
                id="orderId"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID (e.g., ORD2019947)"
              />
              <Button type="button" variant="outline" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Sale Details */}
          {selectedSale && (
            <div className="rounded-lg bg-secondary p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer:</span>
                <span className="font-medium">
                  {selectedSale.customer_name || selectedSale.customer_code}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Amount:</span>
                <span className="font-medium">
                  ₹{Number(selectedSale.total_amount).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Received:</span>
                <span className="font-medium text-success">
                  ₹{Number(selectedSale.amount_received).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                <span>Balance:</span>
                <span className="text-destructive">
                  ₹{Number(selectedSale.balance_amount).toLocaleString()}
                </span>
              </div>
            </div>
          )}

          {selectedSale && Number(selectedSale.balance_amount) > 0 && (
            <>
              {/* Payment Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input
                    id="paymentDate"
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Add</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="1"
                    max={Number(selectedSale.balance_amount)}
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <Select value={accountReceived} onValueChange={setAccountReceived}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS.map((acc) => (
                        <SelectItem key={acc} value={acc}>
                          {acc}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reference">Payment Reference</Label>
                  <Input
                    id="reference"
                    value={paymentReference}
                    onChange={(e) => setPaymentReference(e.target.value)}
                    placeholder="Enter reference number"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatePayment.isPending}
                  className="bg-[image:var(--gradient-primary)]"
                >
                  {updatePayment.isPending ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </>
          )}

          {selectedSale && Number(selectedSale.balance_amount) === 0 && (
            <div className="rounded-lg bg-success/10 p-4 text-center text-success">
              This order is fully paid!
            </div>
          )}

          {!selectedSale && orderId && (
            <div className="text-center text-muted-foreground">
              No order found. Please check the Order ID.
            </div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
