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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useUpdateBalancePayment, useSales } from "@/hooks/useSales";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IndianRupee, Search, Package, Phone, Mail, Calendar, User } from "lucide-react";
import { createNotification } from "@/hooks/useNotifications";

interface SaleData {
  order_id: string;
  customer_name?: string | null;
  customer_code: string;
  customer_contact?: string | null;
  customer_email?: string | null;
  employee_name?: string | null;
  sale_date?: string | null;
  total_amount: number;
  amount_received?: number | null;
  balance_amount?: number | null;
  courier_cost?: number | null;
}

interface BalancePaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale?: SaleData | null;
  orderId?: string;
}

const ACCOUNTS = ["Cash", "IDFC4828", "IDFC7455", "Canara", "UPI"];

export const BalancePaymentDialog = ({
  open,
  onOpenChange,
  sale: propSale,
  orderId: initialOrderId,
}: BalancePaymentDialogProps) => {
  const updatePayment = useUpdateBalancePayment();
  const { data: allSales = [] } = useSales();

  // Search mode state (when no sale prop provided)
  const [searchId, setSearchId] = useState(initialOrderId || "");
  const [foundSale, setFoundSale] = useState<SaleData | null>(null);

  const sale = propSale || foundSale;

  const totalAmount = sale ? Number(sale.total_amount) || 0 : 0;
  const amountReceived = sale ? Number(sale.amount_received) || 0 : 0;
  const balanceAmount = Math.max(0, totalAmount - amountReceived);

  // Fetch order items for this sale
  const { data: orderItems, isLoading: itemsLoading } = useQuery({
    queryKey: ["sale-items", sale?.order_id],
    queryFn: async () => {
      if (!sale?.order_id) return [];
      const { data, error } = await supabase
        .from("sale_items")
        .select("*")
        .eq("order_id", sale.order_id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: open && !!sale?.order_id,
  });

  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [amount, setAmount] = useState<string>("");
  const [accountReceived, setAccountReceived] = useState("Cash");
  const [paymentReference, setPaymentReference] = useState("");

  useEffect(() => {
    if (open && sale) {
      const bal = Math.max(0, Number(sale.total_amount) - Number(sale.amount_received || 0));
      setAmount(bal.toString());
      setPaymentDate(new Date().toISOString().split("T")[0]);
      setAccountReceived("Cash");
      setPaymentReference("");
    }
    if (open && !propSale) {
      setFoundSale(null);
      setSearchId(initialOrderId || "");
    }
  }, [open, propSale]);

  // Auto-search when initialOrderId provided
  useEffect(() => {
    if (initialOrderId && allSales.length > 0 && !propSale) {
      const s = allSales.find(s => s.order_id.toLowerCase() === initialOrderId.toLowerCase());
      if (s) setFoundSale(s as unknown as SaleData);
    }
  }, [initialOrderId, allSales, propSale]);

  const handleSearch = () => {
    const s = allSales.find(
      s => s.order_id.toLowerCase() === searchId.toLowerCase() ||
           s.order_id.toLowerCase().includes(searchId.toLowerCase())
    );
    setFoundSale(s ? (s as unknown as SaleData) : null);
    if (s) {
      const bal = Math.max(0, Number(s.total_amount) - Number(s.amount_received || 0));
      setAmount(bal.toString());
    }
  };

  const parsedAmount = Number(amount) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale || parsedAmount <= 0 || parsedAmount > balanceAmount) return;

    await updatePayment.mutateAsync({
      order_id: sale.order_id,
      payment_date: new Date(paymentDate).toISOString(),
      amount: parsedAmount,
      account_received: accountReceived,
      payment_reference: paymentReference,
    });

    await createNotification(
      "Balance Payment Received",
      `₹${parsedAmount.toLocaleString()} received for ${sale.order_id}`,
      "payment",
      { order_id: sale.order_id, amount: parsedAmount, customer: sale.customer_name || sale.customer_code }
    );

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Balance Payment Update</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Search mode: show search bar when no sale prop */}
          {!propSale && (
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID</Label>
              <div className="flex gap-2">
                <Input
                  id="orderId"
                  value={searchId}
                  onChange={(e) => setSearchId(e.target.value)}
                  placeholder="Enter order ID"
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                />
                <Button type="button" variant="outline" onClick={handleSearch}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Order summary */}
          {sale && (
            <div className="rounded-lg bg-secondary p-4 space-y-3">
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Order ID:</span>
                  <span className="font-semibold text-primary">{sale.order_id}</span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-muted-foreground">Customer:</span>
                  <span className="font-medium">{sale.customer_name || sale.customer_code}</span>
                </div>
                {sale.customer_contact && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    <span className="text-foreground text-xs">{sale.customer_contact}</span>
                  </div>
                )}
                {sale.customer_email && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="text-foreground text-xs truncate">{sale.customer_email}</span>
                  </div>
                )}
                {sale.sale_date && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span className="text-foreground text-xs">{new Date(sale.sale_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span>
                  </div>
                )}
                {sale.employee_name && (
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <User className="h-3 w-3" />
                    <span className="text-foreground text-xs">{sale.employee_name}</span>
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-2 space-y-1.5">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount:</span>
                  <span className="font-medium flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{totalAmount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Received:</span>
                  <span className="font-medium text-success flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{amountReceived.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold border-t border-border pt-2">
                  <span>Balance:</span>
                  <span className="text-destructive flex items-center gap-0.5"><IndianRupee className="h-3 w-3" />{balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}

          {/* Order Items Table */}
          {sale && (
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-muted-foreground flex items-center gap-2">
                <Package className="h-4 w-4" />
                Order Items
              </h4>
              {itemsLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-8 w-full" />
                  <Skeleton className="h-8 w-full" />
                </div>
              ) : orderItems && orderItems.length > 0 ? (
                <div className="max-h-40 overflow-y-auto rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs w-8">#</TableHead>
                        <TableHead className="text-xs">Product Name</TableHead>
                        <TableHead className="text-xs text-center">Qty</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                        <TableHead className="text-xs text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orderItems.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell className="text-xs py-2">{idx + 1}</TableCell>
                          <TableCell className="text-xs py-2 font-medium">{item.product_name}</TableCell>
                          <TableCell className="text-xs py-2 text-center">{Number(item.quantity)}</TableCell>
                          <TableCell className="text-xs py-2 text-right">₹{Number(item.unit_price).toLocaleString()}</TableCell>
                          <TableCell className="text-xs py-2 text-right font-medium">₹{(Number(item.quantity) * Number(item.unit_price)).toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-3 text-muted-foreground text-xs bg-muted/30 rounded-lg">
                  No order items found
                </div>
              )}
            </div>
          )}

          {sale && balanceAmount > 0 && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="paymentDate">Payment Date</Label>
                  <Input id="paymentDate" type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount to Add</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={balanceAmount}
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                    required
                  />
                  {parsedAmount > balanceAmount && (
                    <p className="text-xs text-destructive">Amount cannot exceed balance (₹{balanceAmount.toLocaleString()})</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="account">Account</Label>
                  <Select value={accountReceived} onValueChange={setAccountReceived}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {ACCOUNTS.map((acc) => (
                        <SelectItem key={acc} value={acc}>{acc}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="reference">Payment Reference</Label>
                  <Input id="reference" value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="Enter reference number (optional)" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                <Button type="submit" disabled={updatePayment.isPending || parsedAmount <= 0 || parsedAmount > balanceAmount} className="bg-[image:var(--gradient-primary)]">
                  {updatePayment.isPending ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </>
          )}

          {sale && balanceAmount === 0 && (
            <div className="rounded-lg bg-success/10 p-4 text-center text-success">This order is fully paid!</div>
          )}

          {!propSale && !sale && searchId && (
            <div className="text-center text-muted-foreground">No order found. Please check the Order ID.</div>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
};
