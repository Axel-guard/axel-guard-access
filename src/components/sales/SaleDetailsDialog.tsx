import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Calendar, User, Phone, MapPin, Hash, IndianRupee, Mail, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { useEmail } from "@/hooks/useEmail";

interface SaleDetailsDialogProps {
  sale: {
    order_id: string;
    sale_date: string;
    customer_code: string;
    customer_name?: string | null;
    customer_contact?: string | null;
    company_name?: string | null;
    total_amount: number;
    amount_received?: number | null;
    balance_amount?: number | null;
    remarks?: string | null;
    employee_name?: string;
    sale_type?: string;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const SaleDetailsDialog = ({ sale, open, onOpenChange }: SaleDetailsDialogProps) => {
  const { sendEmail, isLoading } = useEmail();

  if (!sale) return null;

  const totalAmount = Number(sale.total_amount) || 0;
  const amountReceived = Number(sale.amount_received) || 0;
  const balanceAmount = Number(sale.balance_amount) || totalAmount - amountReceived;

  // Extract location from remarks if present
  const location = sale.remarks?.startsWith("Location: ") 
    ? sale.remarks.replace("Location: ", "") 
    : sale.remarks || "-";

  const getStatusBadge = () => {
    if (balanceAmount === 0) {
      return <Badge className="bg-success/10 text-success border-success/20">Fully Paid</Badge>;
    }
    if (amountReceived > 0) {
      return <Badge className="bg-warning/10 text-warning border-warning/20">Partial Payment</Badge>;
    }
    return <Badge className="bg-destructive/10 text-destructive border-destructive/20">Payment Pending</Badge>;
  };

  const handleSendEmail = async () => {
    await sendEmail("sale", sale.order_id);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Hash className="h-5 w-5 text-primary" />
              Sale Details - {sale.order_id}
            </span>
            <div className="flex items-center gap-2">
              {getStatusBadge()}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSendEmail}
                disabled={isLoading}
                className="gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="h-4 w-4" />
                )}
                Send Mail
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Order Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Hash className="h-3 w-3" /> Order ID
              </p>
              <p className="font-semibold text-primary">{sale.order_id}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Sale Date
              </p>
              <p className="font-medium">
                {sale.sale_date ? format(new Date(sale.sale_date), "dd MMM yyyy") : "-"}
              </p>
            </div>
          </div>

          <Separator />

          {/* Customer Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Customer Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Customer Code</p>
                <p className="font-medium text-primary">{sale.customer_code}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3" /> Customer Name
                </p>
                <p className="font-medium">{sale.customer_name || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Phone className="h-3 w-3" /> Mobile
                </p>
                <p className="font-medium">{sale.customer_contact || "-"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> Location
                </p>
                <p className="font-medium">{location}</p>
              </div>
            </div>
            {sale.company_name && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Company Name</p>
                <p className="font-medium">{sale.company_name}</p>
              </div>
            )}
          </div>

          <Separator />

          {/* Payment Information */}
          <div className="space-y-4">
            <h4 className="font-semibold text-sm text-muted-foreground">Payment Information</h4>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-muted/50 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Total Amount</p>
                <p className="text-lg font-bold flex items-center justify-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {totalAmount.toLocaleString()}
                </p>
              </div>
              <div className="bg-success/10 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Amount Received</p>
                <p className="text-lg font-bold text-success flex items-center justify-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {amountReceived.toLocaleString()}
                </p>
              </div>
              <div className="bg-destructive/10 rounded-lg p-4 text-center">
                <p className="text-xs text-muted-foreground mb-1">Balance Amount</p>
                <p className="text-lg font-bold text-destructive flex items-center justify-center gap-1">
                  <IndianRupee className="h-4 w-4" />
                  {balanceAmount.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          {(sale.employee_name || sale.sale_type) && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                {sale.employee_name && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Employee</p>
                    <p className="font-medium">{sale.employee_name}</p>
                  </div>
                )}
                {sale.sale_type && (
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Sale Type</p>
                    <Badge variant="outline">{sale.sale_type} GST</Badge>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
