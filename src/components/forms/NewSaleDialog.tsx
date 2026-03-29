import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X, Loader2, AlertCircle } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateSale, useGenerateOrderId } from "@/hooks/useSales";
import { useProductCategories } from "@/hooks/useProductCategories";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useEmail } from "@/hooks/useEmail";
import { AddEmailDialog } from "@/components/shared/AddEmailDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface SalePrefill {
  customerCode: string;
  customerName: string;
  companyName?: string;
  customerContact: string;
  location?: string;
  email?: string;
}

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill?: SalePrefill;
}

interface ProductItem {
  category: string;
  product_name: string;
  quantity: string;
  unit_price: string;
  lastSoldPrice?: number | null;
}

const ACCOUNTS = ["IDFC4828", "IDFC7455", "Canara", "Cash"];
const SALE_TYPES = ["With GST (18%)", "Without GST"];

// Under 1 kg flat rates; above 1 kg: weight × rate/kg + 10% fuel
const COURIER_RATE_PER_KG: Record<string, number> = {
  "Courier via Air": 110,
  "Courier via Surface": 90,
};
const COURIER_MIN_CHARGE: Record<string, number> = {
  "Courier via Air": 150,
  "Courier via Surface": 100,
};

function calcCourierCharge(totalWeightKg: number, type: string): number {
  if (totalWeightKg <= 0) return 0;
  if (totalWeightKg < 1) return COURIER_MIN_CHARGE[type] ?? (type.includes("Air") ? 150 : 100);
  const rate = COURIER_RATE_PER_KG[type] ?? 110;
  const base = totalWeightKg * rate;
  return Math.round(base + base * 0.10);
}

export const NewSaleDialog = ({ open, onOpenChange, prefill }: NewSaleDialogProps) => {
  const { data: employees = [] } = useEmployees();
  const { data: productData } = useProductCategories();
  const categories = productData?.categories || [];
  const productsByCategory = productData?.productsByCategory || {};
  const createSale = useCreateSale();
  const generateOrderId = useGenerateOrderId();
  const { sendSaleEmail } = useEmail();

  // Fetch product weights (product_name → weight_kg)
  const { data: productWeights = [] } = useQuery({
    queryKey: ["product-weights-sale"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("product_name, weight_kg");
      if (error) throw error;
      return data as { product_name: string; weight_kg: number | null }[];
    },
  });

  const [orderId, setOrderId] = useState<string>("");
  const [isGeneratingOrderId, setIsGeneratingOrderId] = useState(false);

  const [formData, setFormData] = useState({
    customerCode: "",
    customerName: "",
    companyName: "",
    customerContact: "",
    customerEmail: "",
    location: "",
    saleDate: new Date().toISOString().split("T")[0],
    employeeName: "",
    saleType: "",
    courierCost: 0,
    amountReceived: 0,
    accountReceived: "",
    paymentReference: "",
    remarks: "",
  });

  const [products, setProducts] = useState<ProductItem[]>([
    { category: "", product_name: "", quantity: "", unit_price: "" },
  ]);

  const [isLookingUp, setIsLookingUp] = useState(false);
  const [customerNotFound, setCustomerNotFound] = useState(false);
  const [showAddEmailDialog, setShowAddEmailDialog] = useState(false);
  const [emailMissingError, setEmailMissingError] = useState(false);
  const [showCourier, setShowCourier] = useState(false);
  const [courierMode, setCourierMode] = useState("");

  // product_name → weight_kg map
  const productWeightMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const p of productWeights) {
      map[p.product_name] = Number(p.weight_kg) || 0;
    }
    return map;
  }, [productWeights]);

  // Total order weight based on current product rows
  const totalOrderWeight = useMemo(() => {
    return products.reduce((sum, p) => {
      const weight = productWeightMap[p.product_name] || 0;
      const qty = Number(p.quantity) || 0;
      return sum + weight * qty;
    }, 0);
  }, [products, productWeightMap]);

  // Auto-recalculate courier charge when weight or mode changes
  useEffect(() => {
    if (!showCourier || !courierMode) return;
    if (totalOrderWeight <= 0) return;
    setFormData((f) => ({ ...f, courierCost: calcCourierCharge(totalOrderWeight, courierMode) }));
  }, [totalOrderWeight, courierMode, showCourier]);

  // Auto-generate Order ID when dialog opens
  useEffect(() => {
    if (open && !orderId) {
      setIsGeneratingOrderId(true);
      generateOrderId.mutateAsync()
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
  }, [open]);

  // Pre-fill customer fields when prefill prop is provided
  useEffect(() => {
    if (open && prefill) {
      setFormData((prev) => ({
        ...prev,
        customerCode: prefill.customerCode,
        customerName: prefill.customerName,
        companyName: prefill.companyName || "",
        customerContact: prefill.customerContact,
        location: prefill.location || "",
        customerEmail: prefill.email || "",
      }));
      setCustomerNotFound(false);
    }
  }, [open, prefill]);

  // Customer auto-fill from Leads Database (by code or mobile)
  const lookupCustomer = useCallback(async (input: string) => {
    if (!input.trim()) {
      setCustomerNotFound(false);
      return;
    }

    setIsLookingUp(true);
    setCustomerNotFound(false);

    try {
      const trimmed = input.trim();
      // If input is 10+ digits, search by mobile_number; otherwise by customer_code
      const isMobileLookup = /^\d{10,}$/.test(trimmed);
      
      let query = supabase
        .from("leads")
        .select("customer_code, customer_name, mobile_number, company_name, location, email");
      
      if (isMobileLookup) {
        query = query.eq("mobile_number", trimmed);
      } else {
        query = query.eq("customer_code", trimmed);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData((prev) => ({
          ...prev,
          customerCode: data.customer_code || prev.customerCode,
          customerName: data.customer_name || prev.customerName,
          customerContact: data.mobile_number || prev.customerContact,
          companyName: data.company_name || prev.companyName,
          location: data.location || prev.location,
          customerEmail: data.email || prev.customerEmail,
        }));
        setCustomerNotFound(false);
      } else {
        setCustomerNotFound(true);
      }
    } catch (err) {
      console.error("Error looking up customer:", err);
      toast.error("Failed to lookup customer");
    } finally {
      setIsLookingUp(false);
    }
  }, []);

  // Debounced customer code/mobile lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.customerCode.trim()) {
        lookupCustomer(formData.customerCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.customerCode, lookupCustomer]);

  const fetchLastSoldPrice = async (customerCode: string, productName: string): Promise<number | null> => {
    try {
      const { data: salesData } = await supabase
        .from("sales")
        .select("order_id")
        .eq("customer_code", customerCode.trim())
        .order("sale_date", { ascending: false })
        .limit(30);

      if (!salesData?.length) return null;
      const orderIds = salesData.map((s) => s.order_id);

      const { data: itemsData } = await supabase
        .from("sale_items")
        .select("unit_price, order_id")
        .in("order_id", orderIds)
        .eq("product_name", productName);

      if (!itemsData?.length) return null;
      for (const orderId of orderIds) {
        const match = itemsData.find((i) => i.order_id === orderId);
        if (match) return Number(match.unit_price);
      }
      return null;
    } catch {
      return null;
    }
  };

  const addProduct = () => {
    if (products.length < 10) {
      setProducts([...products, { category: "", product_name: "", quantity: "", unit_price: "", lastSoldPrice: null }]);
    }
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = async (index: number, field: keyof ProductItem, value: string | number) => {
    const updated = [...products];
    if (field === "category") {
      updated[index] = { ...updated[index], category: value as string, product_name: "", lastSoldPrice: null };
      setProducts(updated);
    } else if (field === "product_name") {
      updated[index] = { ...updated[index], product_name: value as string, lastSoldPrice: null };
      setProducts([...updated]);
      // Auto-fill last sold price if customer is known
      const customerCode = formData.customerCode.trim();
      if (customerCode && value) {
        const lastPrice = await fetchLastSoldPrice(customerCode, value as string);
        if (lastPrice !== null) {
          setProducts((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], unit_price: String(lastPrice), lastSoldPrice: lastPrice };
            return next;
          });
        }
      }
    } else {
      if (field === "unit_price") {
        updated[index] = { ...updated[index], unit_price: value as string, lastSoldPrice: null };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      setProducts(updated);
    }
  };

  // Calculations - GST only applied when Sale Type is "With GST (18%)"
  const subtotal = products.reduce((sum, p) => {
    const qty = parseFloat(p.quantity) || 0;
    const price = parseFloat(p.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const isWithGST = formData.saleType === "With GST (18%)";
  
  // Courier GST only applies when Sale Type is "With GST"
  const courierGST = isWithGST ? formData.courierCost * 0.18 : 0;
  const productGST = isWithGST ? subtotal * 0.18 : 0;
  const totalGST = productGST + courierGST;
  
  // Total = Subtotal + Courier Cost + GST (if applicable)
  const totalAmount = subtotal + formData.courierCost + totalGST;
  const balanceAmount = totalAmount - formData.amountReceived;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerCode || !formData.employeeName || !formData.saleType || !orderId) {
      if (!orderId) {
        toast.error("Order ID not generated yet. Please wait.");
      }
      return;
    }

    // Check for email
    if (!formData.customerEmail.trim()) {
      setEmailMissingError(true);
      toast.error("Customer email ID is not present. First add email ID, then complete this form.");
      return;
    }
    setEmailMissingError(false);

    const saleTypeValue = isWithGST ? "With" : "Without";

    const createdOrderId = orderId;
    
    await createSale.mutateAsync({
      sale: {
        order_id: orderId,
        customer_code: formData.customerCode,
        customer_name: formData.customerName,
        company_name: formData.companyName,
        customer_contact: formData.customerContact,
        customer_email: formData.customerEmail,
        sale_date: new Date(formData.saleDate).toISOString(),
        employee_name: formData.employeeName,
        sale_type: saleTypeValue,
        courier_cost: formData.courierCost,
        amount_received: formData.amountReceived,
        account_received: formData.accountReceived,
        payment_reference: formData.paymentReference,
        remarks: formData.remarks,
        subtotal,
        gst_amount: totalGST,
        total_amount: totalAmount,
        balance_amount: balanceAmount,
      },
      items: products
        .filter((p) => p.product_name)
        .map((p) => ({
          order_id: orderId,
          product_name: p.product_name,
          quantity: parseFloat(p.quantity) || 0,
          unit_price: parseFloat(p.unit_price) || 0,
        })),
    });

    // Send sale confirmation email only for "With Bill" sales (non-blocking)
    if (isWithGST) {
      sendSaleEmail(createdOrderId).catch(emailError => {
        console.error("Failed to send sale email:", emailError);
      });
    }

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setOrderId("");
    setFormData({
      customerCode: "",
      customerName: "",
      companyName: "",
      customerContact: "",
      customerEmail: "",
      location: "",
      saleDate: new Date().toISOString().split("T")[0],
      employeeName: "",
      saleType: "",
      courierCost: 0,
      amountReceived: 0,
      accountReceived: "",
      paymentReference: "",
      remarks: "",
    });
    setProducts([{ category: "", product_name: "", quantity: "", unit_price: "" }]);
    setCustomerNotFound(false);
    setShowCourier(false);
    setCourierMode("");
  };

  const AutoFillHint = () => (
    <span className="text-xs font-normal ml-1" style={{ color: '#f97316' }}>(Auto-filled or enter manually)</span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl font-bold">Add New Sale</DialogTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Order ID:</span>
              {isGeneratingOrderId ? (
                <span className="inline-flex items-center gap-1 rounded-lg bg-muted px-3 py-1 text-sm font-medium">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Generating...
                </span>
              ) : (
                <span className="inline-flex items-center rounded-lg bg-success/10 px-3 py-1 text-sm font-bold text-success border border-success/20">
                  {orderId}
                </span>
              )}
            </div>
          </div>
        </DialogHeader>

        {emailMissingError && (
          <Alert variant="destructive" className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Customer email ID is not present. First add email ID, then complete this form.
              </AlertDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowAddEmailDialog(true)}
              className="ml-4 shrink-0"
            >
              Add Email ID
            </Button>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Row 1: Customer Code, Customer Name, Mobile Number */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="customerCode">Customer Code / Mobile Number *</Label>
              <div className="relative">
                <Input
                  id="customerCode"
                  value={formData.customerCode}
                  onChange={(e) =>
                    setFormData({ ...formData, customerCode: e.target.value })
                  }
                  placeholder="Enter Customer Code or Mobile Number..."
                  required
                  className={customerNotFound ? "border-destructive" : ""}
                />
                {isLookingUp && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {customerNotFound && (
                <p className="text-xs text-destructive">Customer not found. Please check the code/number or add a new lead.</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerName">
                Customer Name <AutoFillHint />
              </Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData({ ...formData, customerName: e.target.value })
                }
                placeholder="Will be auto-filled or enter manually"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerContact">
                Mobile Number <AutoFillHint />
              </Label>
              <Input
                id="customerContact"
                value={formData.customerContact}
                onChange={(e) =>
                  setFormData({ ...formData, customerContact: e.target.value })
                }
                placeholder="Will be auto-filled or enter manually"
              />
            </div>
          </div>

          {/* Row 2: Company Name, Email, Location */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                Company Name <AutoFillHint />
              </Label>
              <Input
                id="companyName"
                value={formData.companyName}
                onChange={(e) =>
                  setFormData({ ...formData, companyName: e.target.value })
                }
                placeholder="Will be auto-filled or enter manually"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerEmail">
                Customer Email <AutoFillHint />
              </Label>
              <Input
                id="customerEmail"
                type="email"
                value={formData.customerEmail}
                onChange={(e) =>
                  setFormData({ ...formData, customerEmail: e.target.value })
                }
                placeholder="Will be auto-filled or enter manually"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">
                Location <AutoFillHint />
              </Label>
              <Input
                id="location"
                value={formData.location}
                onChange={(e) =>
                  setFormData({ ...formData, location: e.target.value })
                }
                placeholder="Will be auto-filled or enter manually"
              />
            </div>
          </div>

          {/* Row 3: Date of Sale, Employee, Sale Type */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="saleDate">Date of Sale *</Label>
              <Input
                id="saleDate"
                type="date"
                value={formData.saleDate}
                onChange={(e) =>
                  setFormData({ ...formData, saleDate: e.target.value })
                }
                required
              />
            </div>
          </div>

          {/* Row 4: Courier Cost */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="employeeName">Employee Name *</Label>
              <Select
                value={formData.employeeName}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeName: value })
                }
              >
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
              <Label htmlFor="saleType">Sale Type *</Label>
              <Select
                value={formData.saleType}
                onValueChange={(value) =>
                  setFormData({ ...formData, saleType: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  {SALE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Courier</Label>
              {!showCourier ? (
                <button
                  type="button"
                  onClick={() => setShowCourier(true)}
                  className="w-full text-sm text-primary border border-dashed border-primary/40 rounded-lg py-2 px-3 hover:bg-primary/5 transition-colors flex items-center justify-center gap-1"
                >
                  + Add Courier Charges
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-1">
                    <Select
                      value={courierMode}
                      onValueChange={(val) => {
                        setCourierMode(val);
                        // Auto-calculate based on weight; fallback to min charge
                        const wt = totalOrderWeight > 0 ? totalOrderWeight : 0;
                        setFormData((f) => ({ ...f, courierCost: calcCourierCharge(wt > 0 ? wt : 0.5, val) }));
                      }}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Courier via Air">Air</SelectItem>
                        <SelectItem value="Courier via Surface">Surface</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      min="0"
                      value={formData.courierCost || ""}
                      onChange={(e) =>
                        setFormData({ ...formData, courierCost: Number(e.target.value) || 0 })
                      }
                      placeholder="₹0"
                      className="w-24"
                    />
                    <button
                      type="button"
                      onClick={() => { setShowCourier(false); setCourierMode(""); setFormData(f => ({ ...f, courierCost: 0 })); }}
                      className="text-muted-foreground hover:text-destructive text-xs px-1"
                      title="Remove courier"
                    >
                      ✕
                    </button>
                  </div>
                  {totalOrderWeight > 0 && (
                    <p className="text-xs text-muted-foreground">Total order weight: {totalOrderWeight.toFixed(2)} kg</p>
                  )}
                  {formData.courierCost > 0 && isWithGST && (
                    <p className="text-xs text-muted-foreground">+18% GST: ₹{courierGST.toFixed(2)}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Amount Received, In Account Received, Payment Reference */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount Received</Label>
              <Input
                id="amountReceived"
                type="number"
                min="0"
                value={formData.amountReceived || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountReceived: Number(e.target.value) || 0,
                  })
                }
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="accountReceived">In Account Received</Label>
              <Select
                value={formData.accountReceived}
                onValueChange={(value) =>
                  setFormData({ ...formData, accountReceived: value })
                }
              >
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
              <Label htmlFor="paymentReference">Payment Reference Number</Label>
              <Input
                id="paymentReference"
                value={formData.paymentReference}
                onChange={(e) =>
                  setFormData({ ...formData, paymentReference: e.target.value })
                }
                placeholder="Enter reference number"
              />
            </div>
          </div>

          {/* Row 5: Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Add any additional notes"
              rows={2}
            />
          </div>

          {/* Product Details Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Product Details</h3>
            
            {/* Product Table Header */}
            <div className="grid gap-2 md:grid-cols-[1fr_1.5fr_80px_100px_100px_40px] items-end text-sm font-medium text-muted-foreground">
              <span>Category</span>
              <span>Product Name</span>
              <span>Quantity</span>
              <span>Unit Price</span>
              <span>Total</span>
              <span></span>
            </div>

            {products.map((product, index) => (
              <div key={index} className="grid gap-2 md:grid-cols-[1fr_1.5fr_80px_100px_100px_40px] items-end">
                <Select
                  value={product.category}
                  onValueChange={(value) =>
                    updateProduct(index, "category", value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select
                  value={product.product_name}
                  onValueChange={(value) =>
                    updateProduct(index, "product_name", value)
                  }
                  disabled={!product.category}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={product.category ? "Select Product" : "Select Category First"} />
                  </SelectTrigger>
                  <SelectContent>
                    {(productsByCategory[product.category] || []).map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Input
                  type="number"
                  min="0"
                  value={product.quantity}
                  onChange={(e) =>
                    updateProduct(index, "quantity", e.target.value)
                  }
                  placeholder="Enter qty"
                />
                
                <div>
                  <Input
                    type="number"
                    min="0"
                    value={product.unit_price}
                    onChange={(e) => updateProduct(index, "unit_price", e.target.value)}
                    placeholder="Enter price"
                    className={product.lastSoldPrice != null ? "border-primary/50" : ""}
                  />
                  {product.lastSoldPrice != null && (
                    <p className="text-[10px] text-primary mt-0.5 leading-tight">
                      Last sold: ₹{product.lastSoldPrice.toLocaleString("en-IN")}
                    </p>
                  )}
                </div>
                
                <Input
                  readOnly
                  value={
                    product.quantity && product.unit_price
                      ? (parseFloat(product.quantity) || 0) * (parseFloat(product.unit_price) || 0)
                      : ""
                  }
                  className="bg-muted"
                  placeholder="Total"
                />
                
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  onClick={() => removeProduct(index)}
                  className="h-10 w-10"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={addProduct}
              disabled={products.length >= 10}
            >
              <Plus className="mr-1 h-4 w-4" />
              Add Product
            </Button>
          </div>

          {/* Totals Section */}
          <div className="rounded-lg bg-secondary/50 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal (Products):</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            {isWithGST && productGST > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Product GST (18%):</span>
                <span className="font-medium">₹{productGST.toFixed(2)}</span>
              </div>
            )}
            {formData.courierCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Courier Cost:</span>
                <span className="font-medium">₹{formData.courierCost.toFixed(2)}</span>
              </div>
            )}
            {isWithGST && formData.courierCost > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Courier GST (18%):</span>
                <span className="font-medium">₹{courierGST.toFixed(2)}</span>
              </div>
            )}
            {isWithGST && totalGST > 0 && (
              <div className="flex justify-between text-sm border-t border-border pt-2">
                <span className="text-muted-foreground">Total GST:</span>
                <span className="font-medium">₹{totalGST.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-semibold border-t border-primary pt-2">
              <span className="text-primary">Total Amount:</span>
              <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Amount Received:</span>
              <span className="font-medium">₹{formData.amountReceived.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className={balanceAmount > 0 ? "text-destructive font-medium" : "text-success font-medium"}>
                ₹{balanceAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createSale.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createSale.isPending ? "Saving..." : "Save Sale"}
            </Button>
          </div>
        </form>

        <AddEmailDialog
          open={showAddEmailDialog}
          onOpenChange={setShowAddEmailDialog}
          customerCode={formData.customerCode}
          customerName={formData.customerName}
          onEmailSaved={(email) => {
            setFormData((prev) => ({ ...prev, customerEmail: email }));
            setEmailMissingError(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
