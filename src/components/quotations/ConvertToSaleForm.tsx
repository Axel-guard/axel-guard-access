import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Plus,
  X,
  Loader2,
  ShoppingCart,
  CheckCircle2,
  Package,
  Truck,
  CreditCard,
} from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useGenerateOrderId, useCreateSale } from "@/hooks/useSales";
import {
  useQuotationWithItems,
  Quotation,
  QuotationItem,
} from "@/hooks/useQuotations";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { createNotification } from "@/hooks/useNotifications";
import { useEmail } from "@/hooks/useEmail";
import { numberToWords } from "@/lib/numberToWords";

interface ConvertToSaleFormProps {
  quotationId: string;
  onBack: () => void;
}

interface ProductItem {
  product_code: string;
  product_name: string;
  quantity: string;
  unit_price: string;
}

const ACCOUNTS = ["IDFC4828", "IDFC7455", "Canara", "Cash"];

export const ConvertToSaleForm = ({
  quotationId,
  onBack,
}: ConvertToSaleFormProps) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: employees = [] } = useEmployees();
  const { data: quotationData, isLoading: isLoadingQuotation } =
    useQuotationWithItems(quotationId);
  const generateOrderId = useGenerateOrderId();
  const createSale = useCreateSale();
  const { sendSaleEmail } = useEmail();

  // Form state
  const [orderId, setOrderId] = useState<string>("");
  const [isGeneratingOrderId, setIsGeneratingOrderId] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  // Customer details
  const [customerCode, setCustomerCode] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customerContact, setCustomerContact] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // Sale details
  const [saleDate, setSaleDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [employeeName, setEmployeeName] = useState("");
  const [applyGst, setApplyGst] = useState(false);
  const [courierType, setCourierType] = useState("");
  const [courierCost, setCourierCost] = useState(0);

  // Payment details
  const [amountReceived, setAmountReceived] = useState(0);
  const [accountReceived, setAccountReceived] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [remarks, setRemarks] = useState("");

  // Products
  const [products, setProducts] = useState<ProductItem[]>([]);

  // Generate Order ID
  useEffect(() => {
    if (!orderId) {
      setIsGeneratingOrderId(true);
      generateOrderId
        .mutateAsync()
        .then((id) => {
          setOrderId(id);
        })
        .catch((err) => {
          console.error("Failed to generate order ID:", err);
          toast.error("Failed to generate Order ID");
        })
        .finally(() => {
          setIsGeneratingOrderId(false);
        });
    }
  }, []);

  // Pre-fill form from quotation data
  useEffect(() => {
    if (quotationData) {
      setCustomerCode(quotationData.customer_code || "");
      setCustomerId(quotationData.customer_id || null);
      setCustomerName(quotationData.customer_name || "");
      setCompanyName(quotationData.company_name || "");
      setCustomerContact(quotationData.mobile || "");
      setAddress(quotationData.address || "");
      setGstNumber(quotationData.gst_number || "");
      setApplyGst(quotationData.apply_gst || false);
      setCourierType(quotationData.courier_type || "");
      setCourierCost(quotationData.courier_charge || 0);

      // Pre-fill products
      if (quotationData.items && quotationData.items.length > 0) {
        setProducts(
          quotationData.items.map((item: any) => ({
            product_code: item.product_code || "",
            product_name: item.product_name || "",
            quantity: String(item.quantity || 1),
            unit_price: String(item.unit_price || 0),
          }))
        );
      } else {
        setProducts([
          { product_code: "", product_name: "", quantity: "", unit_price: "" },
        ]);
      }
    }
  }, [quotationData]);

  // Calculations
  const subtotal = products.reduce((sum, p) => {
    const qty = parseFloat(p.quantity) || 0;
    const price = parseFloat(p.unit_price) || 0;
    return sum + qty * price;
  }, 0);

  const courierGST = applyGst ? courierCost * 0.18 : 0;
  const productGST = applyGst ? subtotal * 0.18 : 0;
  const totalGST = productGST + courierGST;
  const totalAmount = subtotal + courierCost + totalGST;
  const balanceAmount = Math.max(0, totalAmount - amountReceived);

  // Product handlers
  const addProduct = () => {
    if (products.length < 10) {
      setProducts([
        ...products,
        { product_code: "", product_name: "", quantity: "", unit_price: "" },
      ]);
    }
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (
    index: number,
    field: keyof ProductItem,
    value: string
  ) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  // Validation
  const validateForm = (): boolean => {
    if (!customerCode.trim()) {
      toast.error("Customer Code is required");
      return false;
    }
    if (!employeeName) {
      toast.error("Please select an employee");
      return false;
    }
    const validProducts = products.filter((p) => p.product_name.trim());
    if (validProducts.length === 0) {
      toast.error("At least one product is required");
      return false;
    }
    for (const p of validProducts) {
      const qty = parseFloat(p.quantity);
      const price = parseFloat(p.unit_price);
      if (!qty || qty <= 0) {
        toast.error(`Quantity must be > 0 for ${p.product_name}`);
        return false;
      }
      if (!price || price <= 0) {
        toast.error(`Price must be > 0 for ${p.product_name}`);
        return false;
      }
    }
    return true;
  };

  // Submit handler
  const handleConfirmSale = async () => {
    if (!validateForm() || !orderId) {
      if (!orderId) {
        toast.error("Order ID not generated yet. Please wait.");
      }
      return;
    }

    setIsConverting(true);

    try {
      const saleTypeValue = applyGst ? "With" : "Without";

      // Create the sale
      await createSale.mutateAsync({
        sale: {
          order_id: orderId,
          customer_code: customerCode,
          customer_name: customerName,
          company_name: companyName,
          customer_contact: customerContact,
          sale_date: new Date(saleDate).toISOString(),
          employee_name: employeeName,
          sale_type: saleTypeValue,
          courier_cost: courierCost,
          amount_received: amountReceived,
          account_received: accountReceived || null,
          payment_reference: paymentReference || null,
          remarks: remarks || null,
          subtotal,
          gst_amount: totalGST,
          total_amount: totalAmount,
          balance_amount: balanceAmount,
        },
        items: products
          .filter((p) => p.product_name.trim())
          .map((p) => ({
            order_id: orderId,
            product_name: p.product_name,
            quantity: parseFloat(p.quantity) || 0,
            unit_price: parseFloat(p.unit_price) || 0,
          })),
      });

      // Update quotation status to Converted
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "Converted",
          converted_order_id: orderId,
        })
        .eq("id", quotationId);

      if (updateError) {
        console.error("Failed to update quotation status:", updateError);
      }

      // Send notification
      createNotification(
        "Quotation Converted to Sale",
        `Quotation #${quotationData?.quotation_no} converted to Sale #${orderId} for ${customerName}. Total: ₹${totalAmount.toLocaleString()}`,
        "sale",
        {
          order_id: orderId,
          quotation_no: quotationData?.quotation_no,
          customer_name: customerName,
          total_amount: totalAmount,
          event: "quotation_converted",
        }
      );

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales"] });

      toast.success(`Sale created successfully with Order ID: ${orderId}`);

      // Send sale email (non-blocking)
      sendSaleEmail(orderId).catch((err) => {
        console.error("Failed to send sale email:", err);
      });

      // Navigate to sales page
      navigate("/sales");
    } catch (error: any) {
      console.error("Failed to convert quotation:", error);
      toast.error(error.message || "Failed to create sale");
    } finally {
      setIsConverting(false);
    }
  };

  if (isLoadingQuotation) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-3 text-muted-foreground">
          Loading quotation data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <ShoppingCart className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Convert to Sale</h2>
              <p className="text-sm text-muted-foreground">
                Converting Quotation{" "}
                <span className="font-semibold text-primary">
                  {quotationData?.quotation_no}
                </span>
              </p>
            </div>
          </div>
        </div>

        {/* Order ID Badge */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">New Order ID:</span>
          {isGeneratingOrderId ? (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </Badge>
          ) : (
            <Badge className="bg-success/10 text-success border-success/20 text-base font-bold px-3 py-1">
              {orderId}
            </Badge>
          )}
        </div>
      </div>

      {/* Customer Details Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Package className="h-4 w-4" />
            Customer Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Customer Code *</Label>
              <Input
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="Customer Code"
              />
            </div>
            <div className="space-y-2">
              <Label>Customer Name *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer Name"
              />
            </div>
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                value={customerContact}
                onChange={(e) => setCustomerContact(e.target.value)}
                placeholder="Mobile Number"
              />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Company Name</Label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Company Name"
              />
            </div>
            <div className="space-y-2">
              <Label>GST Number</Label>
              <Input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="GST Number"
              />
            </div>
            <div className="space-y-2">
              <Label>Sale Date *</Label>
              <Input
                type="date"
                value={saleDate}
                onChange={(e) => setSaleDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Complete Address"
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Sale Settings Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Sale Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Employee Name *</Label>
              <Select value={employeeName} onValueChange={setEmployeeName}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Employee" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.name}>
                      {emp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Courier Mode</Label>
              <Select value={courierType} onValueChange={setCourierType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Courier Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Courier via Air">
                    Courier via Air
                  </SelectItem>
                  <SelectItem value="Courier via Surface">
                    Courier via Surface
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Courier Cost (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={courierCost || ""}
                onChange={(e) => setCourierCost(parseFloat(e.target.value) || 0)}
                placeholder="Courier Cost"
              />
            </div>
          </div>

          {/* GST Toggle */}
          <div className="flex items-center justify-between rounded-lg border p-4 bg-primary/5 border-primary/20">
            <div>
              <Label className="font-medium">GST (18%)</Label>
              <p className="text-sm text-muted-foreground">
                Apply 18% GST to products & courier
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`text-sm font-medium ${
                  !applyGst ? "text-primary" : "text-muted-foreground"
                }`}
              >
                OFF
              </span>
              <Switch checked={applyGst} onCheckedChange={setApplyGst} />
              <span
                className={`text-sm font-medium ${
                  applyGst ? "text-primary" : "text-muted-foreground"
                }`}
              >
                ON
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Products Card */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Products</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProduct}
              className="gap-1"
              disabled={products.length >= 10}
            >
              <Plus className="h-4 w-4" />
              Add Product
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="p-3 text-center font-medium w-12">#</th>
                  <th className="p-3 text-left font-medium">Product Name</th>
                  <th className="p-3 text-center font-medium w-28">Qty</th>
                  <th className="p-3 text-right font-medium w-36">
                    Unit Price (₹)
                  </th>
                  <th className="p-3 text-right font-medium w-36">
                    Line Total
                  </th>
                  <th className="p-3 text-center font-medium w-16">Action</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product, index) => {
                  const qty = parseFloat(product.quantity) || 0;
                  const price = parseFloat(product.unit_price) || 0;
                  const lineTotal = qty * price;

                  return (
                    <tr key={index} className="border-t">
                      <td className="p-3 text-center text-muted-foreground">
                        {index + 1}
                      </td>
                      <td className="p-3">
                        <Input
                          value={product.product_name}
                          onChange={(e) =>
                            updateProduct(index, "product_name", e.target.value)
                          }
                          placeholder="Product Name"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={product.quantity}
                          onChange={(e) =>
                            updateProduct(index, "quantity", e.target.value)
                          }
                          placeholder="Qty"
                          className="text-center"
                        />
                      </td>
                      <td className="p-3">
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={product.unit_price}
                          onChange={(e) =>
                            updateProduct(index, "unit_price", e.target.value)
                          }
                          placeholder="Price"
                          className="text-right"
                        />
                      </td>
                      <td className="p-3 text-right font-medium">
                        ₹
                        {lineTotal.toLocaleString("en-IN", {
                          minimumFractionDigits: 2,
                        })}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeProduct(index)}
                          disabled={products.length === 1}
                          className="h-8 w-8 text-destructive hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details Card */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Amount Received (₹)</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amountReceived || ""}
                onChange={(e) =>
                  setAmountReceived(parseFloat(e.target.value) || 0)
                }
                placeholder="Amount Received"
              />
            </div>
            <div className="space-y-2">
              <Label>Account Received</Label>
              <Select value={accountReceived} onValueChange={setAccountReceived}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Account" />
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
              <Label>Payment Reference</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Transaction ID / Check No"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional notes..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Summary Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-2">
            <div className="flex w-full max-w-sm justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {courierCost > 0 && (
              <div className="flex w-full max-w-sm justify-between text-sm">
                <span className="text-muted-foreground">
                  {courierType || "Courier"}:
                </span>
                <span className="font-medium">
                  ₹
                  {courierCost.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            {applyGst && (
              <div className="flex w-full max-w-sm justify-between text-sm">
                <span className="text-muted-foreground">GST (18%):</span>
                <span className="font-medium text-primary">
                  ₹
                  {totalGST.toLocaleString("en-IN", {
                    minimumFractionDigits: 2,
                  })}
                </span>
              </div>
            )}
            <div className="flex w-full max-w-sm justify-between border-t pt-2">
              <span className="font-semibold">Grand Total:</span>
              <span className="text-lg font-bold text-primary">
                ₹
                {totalAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex w-full max-w-sm justify-between text-sm">
              <span className="text-muted-foreground">Amount Received:</span>
              <span className="font-medium text-success">
                ₹
                {amountReceived.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <div className="flex w-full max-w-sm justify-between text-sm">
              <span className="text-muted-foreground">Balance Due:</span>
              <span
                className={`font-bold ${
                  balanceAmount > 0 ? "text-destructive" : "text-success"
                }`}
              >
                ₹
                {balanceAmount.toLocaleString("en-IN", {
                  minimumFractionDigits: 2,
                })}
              </span>
            </div>
            <p className="w-full max-w-md text-right text-sm italic text-muted-foreground pt-2">
              {numberToWords(totalAmount)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button variant="outline" onClick={onBack} disabled={isConverting}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <Button
          onClick={handleConfirmSale}
          disabled={isConverting || isGeneratingOrderId || !orderId}
          className="gap-2 bg-success hover:bg-success/90"
        >
          {isConverting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating Sale...
            </>
          ) : (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Confirm & Create Sale
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
