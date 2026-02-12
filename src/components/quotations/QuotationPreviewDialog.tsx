import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useQuotationWithItems } from "@/hooks/useQuotations";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { QuotationStatusBadge } from "./QuotationStatusBadge";

interface QuotationPreviewDialogProps {
  quotationId: string | null;
  onClose: () => void;
}

export const QuotationPreviewDialog = ({ quotationId, onClose }: QuotationPreviewDialogProps) => {
  const { data: quotation, isLoading } = useQuotationWithItems(quotationId);

  return (
    <Dialog open={!!quotationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            Quotation Preview
            {quotation && <QuotationStatusBadge status={quotation.status} />}
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : quotation ? (
          <div className="space-y-5">
            {/* Company Header */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <h3 className="font-bold text-base">RealTrack Technology</h3>
              <p className="text-sm text-muted-foreground">(Brand: AxelGuard)</p>
              <p className="text-xs text-muted-foreground mt-1">
                GST: 09FSEPP6050C1ZQ | +91 8755311835 | info@axel-guard.com
              </p>
              <p className="text-xs text-muted-foreground">
                Office No 210, PC Chamber, Sector 66 Noida (UP) - 201301
              </p>
            </div>

            {/* Quotation Info + Customer */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-semibold text-sm text-primary">Estimate For:</h4>
                <p className="font-bold">{quotation.company_name || quotation.customer_name}</p>
                {quotation.company_name && quotation.customer_name && (
                  <p className="text-sm text-muted-foreground">Contact: {quotation.customer_name}</p>
                )}
                {quotation.mobile && <p className="text-sm text-muted-foreground">📞 {quotation.mobile}</p>}
                {quotation.customer_email && <p className="text-sm text-muted-foreground">✉️ {quotation.customer_email}</p>}
                {quotation.address && <p className="text-sm text-muted-foreground">{quotation.address}</p>}
                {quotation.gst_number && <p className="text-sm text-muted-foreground">GST: {quotation.gst_number}</p>}
              </div>
              <div className="space-y-2 text-right">
                <p className="text-sm text-muted-foreground">Estimate No:</p>
                <p className="font-bold">{quotation.quotation_no}</p>
                <p className="text-sm text-muted-foreground">Date:</p>
                <p className="font-semibold">{format(new Date(quotation.quotation_date), "dd/MM/yyyy")}</p>
              </div>
            </div>

            <Separator />

            {/* Products Table */}
            <div>
              <h4 className="font-semibold text-sm mb-3">Products</h4>
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-primary text-primary-foreground">
                    <tr>
                      <th className="p-2 text-center">#</th>
                      <th className="p-2 text-left">Item Name</th>
                      <th className="p-2 text-center">Qty</th>
                      <th className="p-2 text-center">Unit</th>
                      <th className="p-2 text-right">Price/Unit</th>
                      <th className="p-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items?.map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b last:border-0">
                        <td className="p-2 text-center">{idx + 1}</td>
                        <td className="p-2">
                          <div>{item.product_name}</div>
                          {item.description && (
                            <div className="text-xs text-muted-foreground italic">{item.description}</div>
                          )}
                        </td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-center">{item.unit || "Pcs"}</td>
                        <td className="p-2 text-right">₹{Number(item.unit_price).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                        <td className="p-2 text-right font-medium">₹{Number(item.amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Summary */}
            <div className="flex justify-end">
              <div className="w-64 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal:</span>
                  <span>₹{Number(quotation.subtotal).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(quotation.courier_charge) > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{quotation.courier_type || "Courier"}:</span>
                    <span>₹{Number(quotation.courier_charge).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                {quotation.apply_gst && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">GST (18%):</span>
                    <span>₹{Number(quotation.gst_amount).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-base">
                  <span>Grand Total:</span>
                  <span className="text-primary">₹{Number(quotation.grand_total).toLocaleString("en-IN", { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Remarks */}
            {(quotation as any).remarks && (
              <div className="bg-muted/50 rounded-lg p-3 border">
                <h4 className="font-semibold text-sm mb-1">Remarks</h4>
                <p className="text-sm text-muted-foreground">{(quotation as any).remarks}</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
