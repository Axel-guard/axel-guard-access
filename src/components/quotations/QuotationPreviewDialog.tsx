import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useQuotationWithItems } from "@/hooks/useQuotations";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { QuotationStatusBadge } from "./QuotationStatusBadge";
import { numberToWords } from "@/lib/numberToWords";
import { FileText, Phone, Mail, MapPin, Building2, CreditCard, QrCode, Shield } from "lucide-react";

interface QuotationPreviewDialogProps {
  quotationId: string | null;
  onClose: () => void;
}

const fmt = (n: number) =>
  `₹${Number(n).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;

const TERMS = [
  "Quotation is valid for 7 days.",
  "Advance payment is required to confirm the order.",
  "Material will be dispatched on the same or next working day after payment (subject to availability).",
  "All products come with a 1-year warranty (except cables).",
  "No return or exchange once sold.",
  "Warranty will be void in case of physical damage, improper installation, or tampering.",
  "The company is not responsible for delivery delays caused by courier/transport.",
];

/** Map GST state codes */
function getStateName(code: string): string | null {
  const states: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
    "36": "Telangana", "37": "Andhra Pradesh",
  };
  return states[code] || null;
}

export const QuotationPreviewDialog = ({ quotationId, onClose }: QuotationPreviewDialogProps) => {
  const { data: quotation, isLoading } = useQuotationWithItems(quotationId);

  const isInterState = quotation?.gst_number && quotation.gst_number.length >= 2 &&
    quotation.gst_number.substring(0, 2) !== "09";

  return (
    <Dialog open={!!quotationId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        {isLoading ? (
          <div className="p-8 space-y-4">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        ) : quotation ? (
          <div className="bg-white">
            {/* ===== HEADER ===== */}
            <div className="bg-muted/40 border-b px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img
                    src="/images/axelguard-logo.png"
                    alt="AxelGuard Logo"
                    className="h-10 w-auto object-contain"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <div>
                    <h3 className="font-bold text-base text-foreground">RealTrack Technology</h3>
                    <p className="text-xs text-muted-foreground">GSTIN: 09FSEPP6050C1ZQ | State: 09-Uttar Pradesh</p>
                  </div>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-0.5">
                  <p className="flex items-center justify-end gap-1"><Phone className="h-3 w-3" /> +91 8755311835</p>
                  <p className="flex items-center justify-end gap-1"><Mail className="h-3 w-3" /> info@axel-guard.com</p>
                  <p className="flex items-center justify-end gap-1"><MapPin className="h-3 w-3" /> Office No 210, PC Chamber</p>
                  <p>Sector 66 Noida (UP) - 201301</p>
                </div>
              </div>
            </div>

            {/* ===== ESTIMATE BANNER ===== */}
            <div className="bg-destructive text-destructive-foreground text-center py-2.5">
              <div className="flex items-center justify-center gap-2">
                <FileText className="h-5 w-5" />
                <span className="font-bold text-lg tracking-wide">Estimate</span>
                <QuotationStatusBadge status={quotation.status} />
              </div>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* ===== CLIENT + ESTIMATE INFO ===== */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
                {/* Left: Client Details (60%) */}
                <div className="sm:col-span-3 space-y-2">
                  <p className="text-xs font-semibold text-destructive uppercase tracking-wider">Estimate For</p>
                  <p className="font-bold text-lg text-foreground">
                    {quotation.company_name || quotation.customer_name || "-"}
                  </p>

                  {quotation.address && (
                    <p className="text-sm text-muted-foreground leading-relaxed">{quotation.address}</p>
                  )}

                  <div className="space-y-1.5 pt-1">
                    {quotation.company_name && quotation.customer_name && quotation.company_name !== quotation.customer_name && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">Contact Person: </span>
                        <span className="font-semibold text-foreground">{quotation.customer_name}</span>
                      </p>
                    )}
                    {quotation.mobile && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-semibold text-foreground">{quotation.mobile}</span>
                      </p>
                    )}
                    {quotation.customer_email && (
                      <p className="text-sm flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-foreground">{quotation.customer_email}</span>
                      </p>
                    )}
                    {quotation.gst_number && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">GSTIN: </span>
                        <span className="font-semibold text-foreground">{quotation.gst_number}</span>
                      </p>
                    )}
                    {quotation.gst_number && quotation.gst_number.length >= 2 && getStateName(quotation.gst_number.substring(0, 2)) && (
                      <p className="text-sm">
                        <span className="text-muted-foreground">State: </span>
                        <span className="text-foreground">{quotation.gst_number.substring(0, 2)}-{getStateName(quotation.gst_number.substring(0, 2))}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Estimate Info Card (40%) */}
                <div className="sm:col-span-2">
                  <div className="bg-muted/50 border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Estimate No.</span>
                      <span className="font-bold text-sm text-foreground">{quotation.quotation_no}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">Date</span>
                      <span className="font-bold text-sm text-foreground">
                        {format(new Date(quotation.quotation_date), "dd/MM/yyyy")}
                      </span>
                    </div>
                    {isInterState && quotation.gst_number && (
                      <>
                        <Separator />
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-muted-foreground">Place of Supply</span>
                          <span className="font-bold text-sm text-foreground">
                            {quotation.gst_number.substring(0, 2)}-{getStateName(quotation.gst_number.substring(0, 2)) || ""}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* ===== PRODUCT TABLE ===== */}
              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-destructive text-destructive-foreground">
                      <th className="px-3 py-2.5 text-center font-semibold text-xs w-10">#</th>
                      <th className="px-3 py-2.5 text-left font-semibold text-xs">Item Name</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs w-16">HSN</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs w-12">Qty</th>
                      <th className="px-3 py-2.5 text-center font-semibold text-xs w-12">Unit</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs w-24">Price/Unit</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs w-28">GST</th>
                      <th className="px-3 py-2.5 text-right font-semibold text-xs w-24">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.items?.map((item: any, idx: number) => {
                      const qty = Number(item.quantity);
                      const price = Number(item.unit_price);
                      const lineAmount = qty * price;
                      const taxPct = Number(item.tax_percent ?? 0);
                      const taxAmt = lineAmount * (taxPct / 100);
                      const finalAmt = lineAmount + taxAmt;

                      return (
                        <tr key={item.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                          <td className="px-3 py-2.5 text-center text-muted-foreground">{idx + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-foreground">{item.product_name}</div>
                            {item.description && (
                              <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>
                            )}
                            {item.model_no && (
                              <div className="text-xs text-muted-foreground">Model: {item.model_no}</div>
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{item.hsn_sac || item.serial_no || "-"}</td>
                          <td className="px-3 py-2.5 text-center font-medium">{qty}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">{item.unit || "Pcs"}</td>
                          <td className="px-3 py-2.5 text-right">{fmt(price)}</td>
                          <td className="px-3 py-2.5 text-right text-xs">
                            {taxPct > 0 ? `${fmt(taxAmt)} (${taxPct}%)` : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(finalAmt)}</td>
                        </tr>
                      );
                    })}
                    {/* Courier as line item */}
                    {Number(quotation.courier_charge) > 0 && (() => {
                      const courierAmt = Number(quotation.courier_charge);
                      const courierGst = Number(quotation.courier_gst_amount) || 0;
                      const courierTaxPct = quotation.apply_courier_gst ? 18 : 0;
                      const courierFinal = courierAmt + courierGst;
                      const itemCount = quotation.items?.length || 0;
                      return (
                        <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors bg-accent/20">
                          <td className="px-3 py-2.5 text-center text-muted-foreground">{itemCount + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium text-foreground flex items-center gap-1.5">
                              🚚 {quotation.courier_type || "Courier Charges"}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">9965</td>
                          <td className="px-3 py-2.5 text-center font-medium">1</td>
                          <td className="px-3 py-2.5 text-center text-xs text-muted-foreground">Pcs</td>
                          <td className="px-3 py-2.5 text-right">{fmt(courierAmt)}</td>
                          <td className="px-3 py-2.5 text-right text-xs">
                            {courierTaxPct > 0 ? `${fmt(courierGst)} (${courierTaxPct}%)` : "-"}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold">{fmt(courierFinal)}</td>
                        </tr>
                      );
                    })()}
                    {/* Totals row */}
                    <tr className="bg-muted/50 font-semibold">
                      <td className="px-3 py-2.5 text-center" colSpan={3}>Total</td>
                      <td className="px-3 py-2.5 text-center">
                        {(quotation.items?.reduce((s: number, i: any) => s + Number(i.quantity), 0) || 0) + (Number(quotation.courier_charge) > 0 ? 1 : 0)}
                      </td>
                      <td className="px-3 py-2.5"></td>
                      <td className="px-3 py-2.5"></td>
                      <td className="px-3 py-2.5 text-right text-xs">
                        {fmt((quotation.items?.reduce((s: number, i: any) => {
                          const la = Number(i.quantity) * Number(i.unit_price);
                          return s + la * (Number(i.tax_percent ?? 0) / 100);
                        }, 0) || 0) + (Number(quotation.courier_gst_amount) || 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right">{fmt(quotation.grand_total)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* ===== TOTALS SUMMARY ===== */}
              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sub Total</span>
                    <span className="font-medium">{fmt(quotation.subtotal)}</span>
                  </div>
                  {quotation.apply_gst && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isInterState ? "IGST@18%" : "GST@18%"}</span>
                      <span className="font-medium">{fmt(quotation.gst_amount)}</span>
                    </div>
                  )}
                  <div className="bg-destructive text-destructive-foreground rounded-lg px-4 py-3 flex justify-between items-center">
                    <span className="font-bold">Grand Total</span>
                    <span className="font-bold text-lg">{fmt(quotation.grand_total)}</span>
                  </div>
                </div>
              </div>

              {/* ===== BANK DETAILS + QR ===== */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-muted/40 border rounded-lg p-4">
                  <h4 className="font-semibold text-sm flex items-center gap-2 mb-3 text-foreground">
                    <CreditCard className="h-4 w-4 text-muted-foreground" /> Pay To
                  </h4>
                  <div className="space-y-1 text-xs text-foreground">
                    <p>Bank Name: <span className="font-medium">IDFC FIRST BANK LTD, NOIDA</span></p>
                    <p>Account No.: <span className="font-medium">10188344828</span></p>
                    <p>IFSC Code: <span className="font-medium">IDFB0020158</span></p>
                    <p>Account Holder: <span className="font-medium">RealTrack Technology</span></p>
                  </div>
                </div>
                <div className="flex flex-col items-center justify-center border rounded-lg p-4 bg-muted/40">
                  <p className="text-xs font-semibold text-destructive mb-2 flex items-center gap-1">
                    <QrCode className="h-3.5 w-3.5" /> Pay by UPI / Scan QR
                  </p>
                  <img
                    src="/images/idfc-qr-scanner.jpeg"
                    alt="QR Code"
                    className="w-24 h-24 object-contain rounded"
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                  <p className="text-xs font-semibold text-foreground mt-2">UPI ID: retrgy@idfcbank</p>
                </div>
              </div>

              {/* ===== AMOUNT IN WORDS ===== */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <p className="text-xs font-semibold text-destructive uppercase tracking-wider mb-1">Estimate Amount In Words</p>
                <p className="text-sm font-medium text-foreground">{numberToWords(Number(quotation.grand_total))}</p>
              </div>

              {/* ===== REMARKS ===== */}
              {(quotation as any).remarks && (
                <div className="border rounded-lg p-4 bg-accent/30 border-accent">
                  <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-2">Remarks</h4>
                  <p className="text-sm text-foreground leading-relaxed">{(quotation as any).remarks}</p>
                </div>
              )}

              {/* ===== TERMS & CONDITIONS ===== */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h4 className="text-xs font-semibold text-destructive uppercase tracking-wider mb-3 flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5" /> Terms & Conditions
                </h4>
                <ol className="space-y-1.5 text-xs text-foreground leading-relaxed list-decimal list-inside">
                  {TERMS.map((term, idx) => (
                    <li key={idx} className="pl-1">{term}</li>
                  ))}
                </ol>
              </div>

              {/* ===== AUTHORIZED SIGNATORY ===== */}
              <div className="pt-4">
                <p className="text-xs text-muted-foreground">For: RealTrack Technology</p>
                <div className="mt-8 w-40 border-t border-muted-foreground/30 pt-2">
                  <p className="text-sm font-semibold text-foreground">Authorized Signatory</p>
                </div>
              </div>
            </div>

            {/* ===== FOOTER BAR ===== */}
            <div className="h-2 bg-destructive w-full" />
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};
