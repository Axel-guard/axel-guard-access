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
import { Alert, AlertDescription } from "@/components/ui/alert";
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
import { AddEmailDialog } from "@/components/shared/AddEmailDialog";

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
  const [remarks, setRemarks] = useState("");
  const [showAddEmailDialog, setShowAddEmailDialog] = useState(false);
  const [emailMissingError, setEmailMissingError] = useState(false);
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
      serial_no: "",
      description: "",
      model_no: "",
      unit: "Pcs",
      quantity: "",
      unit_price: "",
      tax_percent: 0,
      amount: 0,
    },
  ]);

  // Fetch customer by code or mobile number from database
  const fetchCustomerByCodeOrMobile = useCallback(async (input: string) => {
    if (!input.trim()) {
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
      const trimmed = input.trim();
      // If input is 10+ digits, search by mobile_number; otherwise search by customer_code
      const isMobileLookup = /^\d{10,}$/.test(trimmed);
      
      let query = supabase
        .from("leads")
        .select("id, customer_code, customer_name, company_name, complete_address, mobile_number, gst_number, email");
      
      if (isMobileLookup) {
        query = query.eq("mobile_number", trimmed);
      } else {
        query = query.eq("customer_code", trimmed);
      }
      
      const { data, error } = await query.maybeSingle();

      if (error) throw error;

      if (data) {
        setCustomerId(data.id);
        // If searched by mobile, also set the customerCode field
        if (isMobileLookup) {
          setCustomerCode(data.customer_code);
        }
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
      setRemarks((editQuotationData as any).remarks || "");
      setApplyGst(editQuotationData.apply_gst || false);
      setCourierType(editQuotationData.courier_type || "");
      setCourierCharge(Number(editQuotationData.courier_charge) || 0);
      setCustomerFound(true);

      if (editQuotationData.items && editQuotationData.items.length > 0) {
        setItems(
          editQuotationData.items.map((item: any) => ({
            product_code: item.product_code || "",
            product_name: item.product_name || "",
            serial_no: item.serial_no || "",
            description: item.description || "",
            model_no: item.model_no || "",
            unit: item.unit || "Pcs",
            quantity: item.quantity?.toString() || "",
            unit_price: item.unit_price?.toString() || "",
            tax_percent: item.tax_percent ?? 0,
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
        fetchCustomerByCodeOrMobile(value);
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
      fetchCustomerByCodeOrMobile(customerCode);
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

  // Calculate totals with per-item tax
  const getNum = (v: number | string): number =>
    typeof v === "string" ? parseFloat(v) || 0 : v || 0;
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const totalItemTax = items.reduce((sum, item) => {
    const lineAmt = getNum(item.quantity) * getNum(item.unit_price);
    return sum + lineAmt * ((item.tax_percent ?? 0) / 100);
  }, 0);
  // GST amount = total per-item taxes (Apply GST toggle syncs per-item tax_percent)
  const gstAmount = totalItemTax;
  // Courier GST: apply same GST % as products when GST is enabled
  const courierGst = applyGst && courierCharge > 0 ? courierCharge * 0.18 : 0;
  const courierTotal = courierCharge + courierGst;
  const grandTotal = subtotal + gstAmount + courierTotal;

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
    setItems((prev) => [
      ...prev,
      {
        product_code: "",
        product_name: "",
        serial_no: "",
        description: "",
        model_no: "",
        unit: "Pcs",
        quantity: "",
        unit_price: "",
        tax_percent: applyGst ? 18 : 0,
        amount: 0,
      },
    ]);
    // Focus new row after render
    setTimeout(() => {
      const rows = document.querySelectorAll("table tbody tr");
      const lastRow = rows[rows.length - 1];
      const firstInput = lastRow?.querySelector("input");
      firstInput?.focus();
    }, 50);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Sync Apply GST toggle with per-item tax_percent
  const handleGstToggle = (checked: boolean) => {
    setApplyGst(checked);
    setItems((prev) =>
      prev.map((item) => ({ ...item, tax_percent: checked ? 18 : 0 }))
    );
  };

  const handleSave = async () => {
    if (!customerCode.trim()) {
      toast.error("Customer Code or Mobile Number is required");
      return;
    }
    if (customerFound !== true || !customerId) {
      toast.error("Please enter a valid Customer Code or Mobile Number from Lead Database");
      return;
    }
    if (!customerEmail.trim()) {
      setEmailMissingError(true);
      toast.error("Customer email ID is not present. First add email ID, then complete this form.");
      return;
    }
    setEmailMissingError(false);
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
      remarks,
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

  const handleDownloadPDF = async () => {
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
      remarks,
    };

    const validItems = items.filter((i) => i.product_code);
    const doc = await generateQuotationPDF(quotation, validItems);
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
             {/* Customer Code / Mobile Input */}
            <div className="space-y-2">
              <Label htmlFor="customerCode">Customer Code / Mobile Number *</Label>
              <div className="relative">
                <Input
                  id="customerCode"
                  value={customerCode}
                  onChange={(e) => handleCustomerCodeChange(e.target.value)}
                  onBlur={handleCustomerCodeBlur}
                  placeholder="Enter Customer Code or Mobile Number..."
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
                    Customer not found. Please check the code/number or add a new lead.
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
                <Switch checked={applyGst} onCheckedChange={handleGstToggle} />
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
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Products</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-muted/60 border-b border-border">
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10">#</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[180px]">Item</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[100px]">Serial No.</th>
                  <th className="px-2 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[140px]">Description</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider min-w-[110px]">Model No.</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[80px]">Qty</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Unit</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Price/Unit</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[90px]">Tax %</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[100px]">Tax Amt</th>
                  <th className="px-2 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[110px]">Amount</th>
                  <th className="px-2 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-10"></th>
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
              <tfoot>
                <tr className="border-t border-border bg-muted/30">
                  <td colSpan={5} className="px-2 py-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddItem}
                      className="gap-1 text-primary border-primary/30 hover:bg-primary/5"
                    >
                      <Plus className="h-4 w-4" />
                      Add Row
                    </Button>
                  </td>
                  <td className="px-2 py-2 text-center text-sm font-semibold">
                    {items.reduce((s, i) => s + (parseFloat(String(i.quantity)) || 0), 0)}
                  </td>
                  <td></td>
                  <td></td>
                  <td></td>
                  <td className="px-2 py-2 text-right text-sm font-semibold text-muted-foreground">
                    ₹{totalItemTax.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-2 py-2 text-right text-sm font-bold">
                    ₹{(subtotal + totalItemTax).toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add any remarks or special notes for this quotation..."
              rows={3}
            />
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
            {totalItemTax > 0 && (
              <div className="flex w-full max-w-xs justify-between text-sm">
                <span className="text-muted-foreground">Tax Total:</span>
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

        {emailMissingError && (
          <Alert variant="destructive">
            <div className="flex items-center justify-between w-full">
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
            </div>
          </Alert>
        )}
      </div>

      <AddEmailDialog
        open={showAddEmailDialog}
        onOpenChange={setShowAddEmailDialog}
        customerCode={customerCode}
        customerName={customerName}
        onEmailSaved={(email) => {
          setCustomerEmail(email);
          setEmailMissingError(false);
        }}
      />
    </div>
  );
};
