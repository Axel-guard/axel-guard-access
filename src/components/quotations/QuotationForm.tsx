import { useState, useEffect, useCallback } from "react";
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Save,
  FileDown,
  FileText,
  Loader2,
  Check,
  ChevronsUpDown,
  UserPlus,
  AlertCircle,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { QuotationProductRow } from "./QuotationProductRow";
import { generateQuotationPDF } from "./QuotationPDF";
import { numberToWords } from "@/lib/numberToWords";
import {
  useGenerateQuotationNo,
  useCreateQuotation,
  QuotationItem,
} from "@/hooks/useQuotations";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface QuotationFormProps {
  onSuccess?: () => void;
  onConvertToSale?: (quotationId: string) => void;
}

interface Lead {
  id: string;
  customer_code: string;
  customer_name: string;
  company_name: string | null;
  complete_address: string | null;
  mobile_number: string;
  gst_number: string | null;
}

export const QuotationForm = ({ onSuccess, onConvertToSale }: QuotationFormProps) => {
  const navigate = useNavigate();
  const { data: nextQuotationNo } = useGenerateQuotationNo();
  const createQuotation = useCreateQuotation();

  // Customer Code search
  const [customerCodeOpen, setCustomerCodeOpen] = useState(false);
  const [customerCode, setCustomerCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());

  // Customer Details
  const [customerName, setCustomerName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [address, setAddress] = useState("");
  const [mobile, setMobile] = useState("");
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
  const [applyCourierGst, setApplyCourierGst] = useState(false);

  // Products
  const [items, setItems] = useState<QuotationItem[]>([
    {
      product_code: "",
      product_name: "",
      hsn_sac: "",
      quantity: 1,
      unit_price: 0,
      amount: 0,
    },
  ]);

  // Fetch all leads for dropdown
  const { data: leads = [] } = useQuery({
    queryKey: ["leads-for-quotation"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("leads")
        .select("id, customer_code, customer_name, company_name, complete_address, mobile_number, gst_number")
        .order("customer_code", { ascending: true });
      if (error) throw error;
      return data as Lead[];
    },
  });

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

  // Set quotation number when loaded
  useEffect(() => {
    if (nextQuotationNo) {
      setQuotationNo(nextQuotationNo);
    }
  }, [nextQuotationNo]);

  // Highlight fields animation
  const highlightField = useCallback((fields: string[]) => {
    setHighlightedFields(new Set(fields));
    setTimeout(() => {
      setHighlightedFields(new Set());
    }, 2000);
  }, []);

  // Fetch customer details by code
  const fetchCustomerByCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCustomerFound(null);
      return;
    }

    setIsSearching(true);
    
    // Search in leads database
    const lead = leads.find(l => l.customer_code === code);
    
    if (lead) {
      setCustomerName(lead.customer_name || "");
      setCompanyName(lead.company_name || "");
      setAddress(lead.complete_address || "");
      setMobile(lead.mobile_number || "");
      setGstNumber(lead.gst_number || "");
      setCustomerFound(true);
      highlightField(["customerName", "companyName", "address", "mobile", "gstNumber"]);
    } else {
      // Clear fields if not found
      setCustomerName("");
      setCompanyName("");
      setAddress("");
      setMobile("");
      setGstNumber("");
      setCustomerFound(false);
    }
    
    setIsSearching(false);
  }, [leads, highlightField]);

  // Handle customer code selection
  const handleSelectCustomer = (code: string) => {
    setCustomerCode(code);
    setCustomerCodeOpen(false);
    fetchCustomerByCode(code);
  };

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = applyGst ? subtotal * 0.18 : 0;
  const courierGstAmount = applyCourierGst ? courierCharge * 0.18 : 0;
  const grandTotal = subtotal + gstAmount + courierCharge + courierGstAmount;

  const handleUpdateItem = (
    index: number,
    field: keyof QuotationItem,
    value: any
  ) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        product_code: "",
        product_name: "",
        hsn_sac: "",
        quantity: 1,
        unit_price: 0,
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
    if (!customerName || items.every((i) => !i.product_code)) {
      return;
    }

    const quotationData = {
      quotation_no: quotationNo,
      quotation_date: new Date(quotationDate).toISOString(),
      customer_name: customerName,
      company_name: companyName,
      address,
      mobile,
      gst_number: gstNumber,
      subtotal,
      apply_gst: applyGst,
      gst_amount: gstAmount,
      courier_type: courierType,
      courier_charge: courierCharge,
      apply_courier_gst: applyCourierGst,
      courier_gst_amount: courierGstAmount,
      grand_total: grandTotal,
      status: "Draft",
    };

    const validItems = items.filter((i) => i.product_code);

    await createQuotation.mutateAsync({
      quotation: quotationData,
      items: validItems,
    });

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
      gst_number: gstNumber,
      subtotal,
      apply_gst: applyGst,
      gst_amount: gstAmount,
      courier_type: courierType,
      courier_charge: courierCharge,
      apply_courier_gst: applyCourierGst,
      courier_gst_amount: courierGstAmount,
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
            <h2 className="text-xl font-bold">New Quotation</h2>
            <p className="text-sm text-muted-foreground">
              Create a quotation/estimate for your customer
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
            {/* Customer Code Search */}
            <div className="space-y-2">
              <Label>Customer Code *</Label>
              <Popover open={customerCodeOpen} onOpenChange={setCustomerCodeOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={customerCodeOpen}
                    className="w-full justify-between"
                  >
                    {customerCode || "Search or select customer code..."}
                    {isSearching ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[300px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Type customer code..." />
                    <CommandList>
                      <CommandEmpty>
                        <div className="flex flex-col items-center gap-2 py-4">
                          <AlertCircle className="h-8 w-8 text-muted-foreground" />
                          <p className="text-sm text-muted-foreground">No customer found</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => {
                              setCustomerCodeOpen(false);
                              navigate("/leads");
                            }}
                          >
                            <UserPlus className="h-4 w-4" />
                            Create New Lead
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup heading="Customers">
                        {leads.map((lead) => (
                          <CommandItem
                            key={lead.id}
                            value={`${lead.customer_code} ${lead.customer_name}`}
                            onSelect={() => handleSelectCustomer(lead.customer_code)}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                customerCode === lead.customer_code
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            <div className="flex flex-col">
                              <span className="font-medium">{lead.customer_code}</span>
                              <span className="text-xs text-muted-foreground">
                                {lead.customer_name}
                                {lead.company_name && ` - ${lead.company_name}`}
                              </span>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {/* Status indicator */}
              {isSearching && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Fetching customer details...
                </div>
              )}
              {customerFound === true && (
                <Badge variant="outline" className="bg-success/10 text-success border-success/20">
                  <Check className="mr-1 h-3 w-3" />
                  Customer found - details auto-filled
                </Badge>
              )}
              {customerFound === false && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20">
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Customer not found in Lead Database
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
                <Label htmlFor="gstNumber">GST Number</Label>
                <Input
                  id="gstNumber"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  placeholder="Enter GST number (optional)"
                  className={getFieldClassName("gstNumber")}
                />
              </div>
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
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div>
                <Label className="font-medium">Apply GST (18%)</Label>
                <p className="text-sm text-muted-foreground">
                  Add 18% GST to subtotal
                </p>
              </div>
              <Switch checked={applyGst} onCheckedChange={setApplyGst} />
            </div>

            {/* Courier Section */}
            <div className="space-y-3 rounded-lg border p-4">
              <Label className="font-medium">Courier Charges</Label>
              <div className="grid gap-3 sm:grid-cols-2">
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
              <div className="flex items-center gap-3">
                <Switch
                  checked={applyCourierGst}
                  onCheckedChange={setApplyCourierGst}
                  disabled={courierCharge <= 0}
                />
                <Label className="text-sm">Apply GST on courier (18%)</Label>
              </div>
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
                  <th className="p-3 text-left font-medium">Product</th>
                  <th className="p-3 text-left font-medium">HSN/SAC</th>
                  <th className="p-3 text-center font-medium">Qty</th>
                  <th className="p-3 text-right font-medium">Unit Price</th>
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
            {applyGst && (
              <div className="flex w-full max-w-xs justify-between text-sm">
                <span className="text-muted-foreground">GST (18%):</span>
                <span className="font-medium">
                  ₹{gstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
            {courierCharge > 0 && (
              <>
                <div className="flex w-full max-w-xs justify-between text-sm">
                  <span className="text-muted-foreground">Courier Charge:</span>
                  <span className="font-medium">
                    ₹{courierCharge.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                  </span>
                </div>
                {applyCourierGst && (
                  <div className="flex w-full max-w-xs justify-between text-sm">
                    <span className="text-muted-foreground">Courier GST (18%):</span>
                    <span className="font-medium">
                      ₹{courierGstAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </>
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
          disabled={createQuotation.isPending || !customerName || items.every((i) => !i.product_code)}
        >
          <Save className="h-4 w-4" />
          {createQuotation.isPending ? "Saving..." : "Save Quotation"}
        </Button>
      </div>
    </div>
  );
};
