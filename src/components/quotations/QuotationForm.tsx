import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  FileDown,
  FileText,
  Loader2,
  Check,
  UserPlus,
  AlertCircle,
  XCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { QuotationProductRow } from "./QuotationProductRow";
import { generateQuotationPDF } from "./QuotationPDF";
import { numberToWords } from "@/lib/numberToWords";
import { toast } from "sonner";
import {
  useGenerateQuotationNo,
  useCreateQuotation,
  useUpdateQuotation,
  useQuotationWithItems,
  QuotationItem,
} from "@/hooks/useQuotations";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuotationFormProps {
  onSuccess?: () => void;
  onConvertToSale?: (quotationId: string) => void;
  editQuotationId?: string;
}

interface Lead {
  id: string;
  customer_code: string;
  customer_name: string;
  company_name: string | null;
  complete_address: string | null;
  mobile_number: string;
  gst_number: string | null;
  email: string | null;
}

export const QuotationForm = ({ onSuccess, onConvertToSale, editQuotationId }: QuotationFormProps) => {
  const navigate = useNavigate();
  const { data: nextQuotationNo } = useGenerateQuotationNo();
  const createQuotation = useCreateQuotation();
  const updateQuotation = useUpdateQuotation();
  const { data: editQuotationData } = useQuotationWithItems(editQuotationId || null);
  const isEditMode = !!editQuotationId;

  // Customer Code search with debounce
  const [customerCode, setCustomerCode] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [gstNumber, setGstNumber] = useState("");

  // Quotation Info
  const [quotationNo, setQuotationNo] = useState("");
  const [quotationDate, setQuotationDate] = useState(
    format(new Date(), "yyyy-MM-dd")
  );

  // GST & Courier
  const [applyGst, setApplyGst] = useState(false);
  const [courierType, setCourierType] = useState("");
  const [courierCharge, setCourierCharge] = useState(0);

  // Products
  const [items, setItems] = useState<QuotationItem[]>([
    {
      product_code: "",
      product_name: "",
      description: "",
      unit: "Pcs",
      quantity: "",
      unit_price: "",
      amount: 0,
    },
  ]);

  // Fetch customer by code from database
  const fetchCustomerByCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCustomerFound(null);
      setCustomerId(null);
      setCustomerName("");
      setCompanyName("");
      setAddress("");
      setMobile("");
      setCustomerEmail("");
      setGstNumber("");
      return;
    }

    setIsSearching(true);
    
    try {
      const { data, error } = await supabase
        .from("leads")
        .select("id, customer_code, customer_name, company_name, complete_address, mobile_number, gst_number, email")
        .eq("customer_code", code.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomerId(data.id);
        setCustomerName(data.customer_name || "");
        setCompanyName(data.company_name || "");
        setAddress(data.complete_address || "");
        setMobile(data.mobile_number || "");
        setCustomerEmail(data.email || "");
        setGstNumber(data.gst_number || "");
        setCustomerFound(true);
        highlightField(["customerName", "companyName", "address", "mobile", "customerEmail", "gstNumber"]);
      } else {
        // Clear fields if not found
        setCustomerId(null);
        setCustomerName("");
        setCompanyName("");
        setAddress("");
        setMobile("");
        setCustomerEmail("");
        setGstNumber("");
        setCustomerFound(false);
      }
    } catch (err) {
      console.error("Error fetching customer:", err);
      setCustomerFound(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Fetch products
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-quotation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, product_code, product_name, category")
        .order("product_name");
      if (error) throw error;
      return data;
    },
  });

  // Set quotation number when loaded (only for new quotations)
  useEffect(() => {
    if (nextQuotationNo && !isEditMode) {
      setQuotationNo(nextQuotationNo);
    }
  }, [nextQuotationNo, isEditMode]);

  // Pre-fill form when editing
  useEffect(() => {
    if (editQuotationData && isEditMode) {
      setQuotationNo(editQuotationData.quotation_no || "");
      setQuotationDate(format(new Date(editQuotationData.quotation_date), "yyyy-MM-dd"));
      setCustomerCode(editQuotationData.customer_code || "");
      setCustomerId(editQuotationData.customer_id || null);
      setCustomerName(editQuotationData.customer_name || "");
      setCompanyName(editQuotationData.company_name || "");
      setAddress(editQuotationData.address || "");
      setMobile(editQuotationData.mobile || "");
      setCustomerEmail(editQuotationData.customer_email || "");
      setGstNumber(editQuotationData.gst_number || "");
      setApplyGst(editQuotationData.apply_gst || false);
      setCourierType(editQuotationData.courier_type || "");
      setCourierCharge(Number(editQuotationData.courier_charge) || 0);
      setCustomerFound(true);

      if (editQuotationData.items && editQuotationData.items.length > 0) {
        setItems(
          editQuotationData.items.map((item: any) => ({
            product_code: item.product_code || "",
            product_name: item.product_name || "",
            description: item.description || "",
            unit: item.unit || "Pcs",
            quantity: item.quantity?.toString() || "",
            unit_price: item.unit_price?.toString() || "",
            amount: Number(item.amount) || 0,
          }))
        );
      }
    }
  }, [editQuotationData, isEditMode]);

  // Highlight fields animation
  const highlightField = useCallback((fields: string[]) => {
    setHighlightedFields(new Set(fields));
    setTimeout(() => {
      setHighlightedFields(new Set());
    }, 2000);
  }, []);

  // Handle customer code input with debounce
  const handleCustomerCodeChange = (value: string) => {
    setCustomerCode(value);
    setCustomerFound(null);
    
    // Clear previous timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Set new debounce timeout (900ms)
    debounceRef.current = setTimeout(() => {
      if (value.trim()) {
        fetchCustomerByCode(value);
      }
    }, 900);
  };

  // Handle blur event for immediate fetch
  const handleCustomerCodeBlur = () => {
    // Clear debounce timeout
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    if (customerCode.trim() && customerFound === null) {
      fetchCustomerByCode(customerCode);
    }
  };

  // Clear customer code and reset fields
  const handleClearCustomer = () => {
    setCustomerCode("");
    setCustomerId(null);
    setCustomerName("");
    setCompanyName("");
    setAddress("");
    setMobile("");
    setCustomerEmail("");
    setGstNumber("");
    setCustomerFound(null);
  };

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  // Single GST on (Subtotal + Courier)
  const gstAmount = applyGst ? (subtotal + courierCharge) * 0.18 : 0;
  const grandTotal = subtotal + courierCharge + gstAmount;

  const handleUpdateItem = (
    index: number,
    field: keyof QuotationItem,
    value: any
  ) => {
    // Use functional update so multiple rapid updates (e.g. qty + amount)
    // don't overwrite each other within the same event loop.
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_code: "",
        product_name: "",
        description: "",
        unit: "Pcs",
        quantity: "",
        unit_price: "",
        amount: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSave = async () => {
    if (!customerCode.trim()) {
      toast.error("Customer Code is required");
      return;
    }
    if (customerFound !== true || !customerId) {
      toast.error("Please enter a valid Customer Code from Lead Database");
      return;
    }
    if (!customerName || items.every((i) => !i.product_code)) {
      return;
    }

    // Get current user for created_by
    const { data: { user } } = await supabase.auth.getUser();
    
    // Get user role
    let createdRole = "user";
    if (user?.id) {
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      createdRole = roleData?.role || "user";
    }

    const quotationData = {
      quotation_no: quotationNo,
      quotation_date: new Date(quotationDate).toISOString(),
      customer_code: customerCode.trim(),
      customer_id: customerId,
      customer_name: customerName,
      company_name: companyName,
      address,
      mobile,
      customer_email: customerEmail,
      gst_number: gstNumber,
      subtotal,
      apply_gst: applyGst,
      gst_amount: gstAmount,
      courier_type: courierType,
      courier_charge: courierCharge,
      apply_courier_gst: false,
      courier_gst_amount: 0,
      grand_total: grandTotal,
      ...(!isEditMode && {
        status: "Pending Approval",
        created_by: user?.id,
        created_role: createdRole,
      }),
    };

    const validItems = items.filter((i) => i.product_code);

    if (isEditMode && editQuotationId) {
      console.log("Updating quotation:", editQuotationId);
      await updateQuotation.mutateAsync({
        quotationId: editQuotationId,
        quotation: quotationData,
        items: validItems,
      });
    } else {
      await createQuotation.mutateAsync({
        quotation: quotationData as any,
        items: validItems,
      });
    }

    onSuccess?.();
  };

  const handleDownloadPDF = () => {
    const quotation = {
      quotation_no: quotationNo,
      quotation_date: quotationDate,
      customer_name: customerName,
      company_name: companyName,
      address,
      mobile,
      customer_email: customerEmail,
      gst_number: gstNumber,
      subtotal,
      apply_gst: applyGst,
      gst_amount: gstAmount,
      courier_type: courierType,
      courier_charge: courierCharge,
      apply_courier_gst: false,
      courier_gst_amount: 0,
      grand_total: grandTotal,
      status: "Draft",
    };

    const validItems = items.filter((i) => i.product_code);
    const doc = generateQuotationPDF(quotation, validItems);
    doc.save(`Quotation-${quotationNo}.pdf`);
  };

  const getFieldClassName = (fieldName: string) => {
    return cn(
      "transition-all duration-300",
      highlightedFields.has(fieldName) && "ring-2 ring-primary bg-primary/5"
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-bold">{isEditMode ? "Edit Quotation" : "New Quotation"}</h2>
            <p className="text-sm text-muted-foreground">
              {isEditMode ? "Edit and update this quotation" : "Create a quotation/estimate for your customer"}
            </p>
          </div>
        </div>
      </div>

      {/* Customer & Quotation Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Customer Details */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Customer Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Code Input */}
            <div className="space-y-2">
              <Label htmlFor="customerCode">Customer Code *</Label>
              <div className="relative">
                <Input
                  id="customerCode"
                  value={customerCode}
                  onChange={(e) => handleCustomerCodeChange(e.target.value)}
                  onBlur={handleCustomerCodeBlur}
                  placeholder="Enter Customer Code"
                  className={cn(
                    "pr-10",
                    customerFound === true && "border-primary focus-visible:ring-primary",
                    customerFound === false && "border-destructive focus-visible:ring-destructive"
                  )}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isSearching && (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                  {!isSearching && customerFound === true && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                  {!isSearching && customerFound === false && (
                    <XCircle className="h-4 w-4 text-destructive" />
                  )}
                </div>
              </div>

              {/* Status indicator */}
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fetching customer details...
                </div>
              )}
              {customerFound === true && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                    <Check className="mr-1 h-3 w-3" />
                    Customer found - details auto-filled
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={handleClearCustomer}
                  >
                    <XCircle className="h-3 w-3" />
                    Clear
                  </Button>
                </div>
              )}
              {customerFound === false && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Customer not found
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs gap-1"
                    onClick={() => navigate("/leads")}
                  >
                    <UserPlus className="h-3 w-3" />
                    Create New Lead
                  </Button>
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter customer name"
                  readOnly={customerFound === true}
                  className={cn(
                    getFieldClassName("customerName"),
                    customerFound === true && "bg-muted cursor-not-allowed"
                  )}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Enter company name"
                  className={getFieldClassName("companyName")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Enter complete address"
                rows={2}
                className={getFieldClassName("address")}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile</Label>
                <Input
                  id="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="Enter mobile number"
                  readOnly={customerFound === true}
                  className={cn(
                    getFieldClassName("mobile"),
                    customerFound === true && "bg-muted cursor-not-allowed"
                  )}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="Enter customer email"
                  className={getFieldClassName("customerEmail")}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="gstNumber">GST Number</Label>
              <Input
                id="gstNumber"
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                placeholder="Enter GST number (optional)"
                className={getFieldClassName("gstNumber")}
              />
            </div>
          </CardContent>
        </Card>

        {/* Quotation Info */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">Quotation Info</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="quotationNo">Quotation No</Label>
                <Input
                  id="quotationNo"
                  value={quotationNo}
                  readOnly
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quotationDate">Date</Label>
                <Input
                  id="quotationDate"
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
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
                <span className={`text-sm font-medium ${!applyGst ? 'text-primary' : 'text-muted-foreground'}`}>OFF</span>
                <Switch checked={applyGst} onCheckedChange={setApplyGst} />
                <span className={`text-sm font-medium ${applyGst ? 'text-primary' : 'text-muted-foreground'}`}>ON</span>
              </div>
            </div>

            {/* Courier Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="font-medium">Courier Charges</Label>
              <div className="grid gap-3 sm:grid-cols-2 items-center">
                <Select value={courierType} onValueChange={setCourierType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select courier type" />
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
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={courierCharge || ""}
                  onChange={(e) => setCourierCharge(parseFloat(e.target.value) || 0)}
                  placeholder="Courier charge (₹)"
                />
              </div>
              {applyGst && courierCharge > 0 && (
                <p className="text-xs text-muted-foreground">
                  18% GST will be applied on courier charges
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Products</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              Add Row
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50 text-sm">
                <tr>
                  <th className="p-3 text-center font-medium">#</th>
                  <th className="p-3 text-left font-medium">Item Name</th>
                  <th className="p-3 text-center font-medium">Quantity</th>
                  <th className="p-3 text-center font-medium">Unit</th>
                  <th className="p-3 text-right font-medium">Price/Unit</th>
                  <th className="p-3 text-right font-medium">Amount</th>
                  <th className="p-3 text-center font-medium">Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, index) => (
                  <QuotationProductRow
                    key={index}
                    index={index}
                    item={item}
                    products={products}
                    onUpdate={handleUpdateItem}
                    onRemove={handleRemoveItem}
                    canRemove={items.length > 1}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-end space-y-2">
            <div className="flex w-full max-w-xs justify-between text-sm">
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">
                ₹{subtotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            {courierCharge > 0 && (
              <div className="flex w-full max-w-xs justify-between text-sm">
                <span className="text-muted-foreground">{courierType || "Courier Charges"}:</span>
                <span className="font-medium">
                  ₹{courierCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {applyGst && (
              <div className="flex w-full max-w-xs justify-between text-sm">
                <span className="text-muted-foreground">GST (18%):</span>
                <span className="font-medium text-primary">
                  ₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="flex w-full max-w-xs justify-between border-t pt-2">
              <span className="font-semibold">Grand Total:</span>
              <span className="text-lg font-bold text-primary">
                ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
            </div>
            <p className="w-full max-w-md text-right text-sm italic text-muted-foreground">
              {numberToWords(grandTotal)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-end">
        <Button
          variant="outline"
          onClick={handleDownloadPDF}
          className="gap-2"
          disabled={!customerName || items.every((i) => !i.product_code)}
        >
          <FileDown className="h-4 w-4" />
          Download PDF
        </Button>
        <Button
          onClick={handleSave}
          className="gap-2"
          disabled={
            createQuotation.isPending ||
            updateQuotation.isPending ||
            !customerCode.trim() ||
            customerFound !== true ||
            !customerId ||
            !customerName ||
            items.every((i) => !i.product_code)
          }
        >
          <Save className="h-4 w-4" />
          {(createQuotation.isPending || updateQuotation.isPending)
            ? "Saving..."
            : isEditMode
            ? "Update Quotation"
            : "Save Quotation"}
        </Button>
      </div>
    </div>
  );
};
