import { useState, useEffect, useCallback } from "react";
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
import { Plus, X, Loader2 } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateSale, useGenerateOrderId } from "@/hooks/useSales";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductItem {
  category: string;
  product_name: string;
  quantity: string;
  unit_price: string;
}

const CATEGORIES = [
  "MDVR",
  "Monitor & Monitor Kit",
  "Cameras",
  "Dashcam",
  "Storage",
  "RFID Tags",
  "RFID Reader",
  "MDVR Accessories",
  "Other product and Accessories",
];

const PRODUCTS_BY_CATEGORY: Record<string, string[]> = {
  "MDVR": [
    "4ch 1080p HDD MDVR (MR9704C)",
    "4ch 1080p HDD, 4G, GPS MDVR (MR9704E)",
    "4ch 1080p SD Card MDVR (MR9504EC)",
    "4ch 1080p SD, 4G, GPS MDVR (MR9504E)",
    "4ch 1080p SD, 4G, GPS MDVR (MR9504E-A3)",
    "4ch 1080p SD, 4G, wifi, GPS MDVR (MA9504ED)",
    "5ch MDVR HDD 4g + GPS + LAN + RS232 + RS485",
    "5ch MDVR SD 4g + GPS + LAN + RS232 + RS485",
    "8CH HDD MDVR",
    "8ch 4G + GPS MDVR",
    "AI MDVR with (DSM + ADAS) (SD+ 4g + GPS)",
    "AI MDVR with (DSM + ADAS) (SD+HDD+ 4g + GPS)",
    "TVS 4ch 1080p SD, 4G, GPS MDVR",
  ],
  "Monitor & Monitor Kit": [
    "4 inch AV monitor",
    "4k Recording monitor kit 2ch",
    "4k Recording monitor kit 4ch",
    "7\" AV Monitor",
    "7 inch Heavy Duty VGA Monitor",
    "7\" HDMI Monitor",
    "7\" VGA Monitor",
    "720 2ch Recording Monitor Kit",
  ],
  "Cameras": [
    "2 MP Heavy Duty Bullet Camera",
    "2 MP Heavy Duty Dome Camera",
    "2 MP IP Camera",
    "2 MP IR Outdoor Bullet Camera",
    "2 MP IR indoor Dome Camera",
    "2mp IP Dome Audio Camera",
    "2mp IR Audio Camera",
    "4k Monitor Camera",
    "720 Heavy Duty Bullet Camera",
    "ADAS Camera",
    "BSD Camera",
    "DFMS Camera",
    "PTZ Camera",
    "Replacement Bullet Camera 2mp",
    "Replacement Dome Audio Camera",
    "Replacement Dome Camera 2 mp",
    "Reverse Camera",
  ],
  "Dashcam": [
    "10 inch 2 Ch 4g, GPS, Android Dashcam",
    "10 inch 2 Ch Full Touch Dashcam",
    "2ch 4g Dashcam MT95L",
    "2k 12 inch Dashcam",
    "3ch 4g Dashcam with Rear Camera (MT95L-A3)",
    "3ch AI Dashcam ADAS + DSM (MT95C)",
    "4 Inch 2 Ch Dashcam",
    "4 inch 3 camera Dash Cam",
    "4 inch Android Dashcam",
    "4k Dashcam 12 inch",
    "wifi Dash Cam",
  ],
  "Storage": [
    "HDD 1 TB",
    "SD card Holder",
    "Surveillance Grade 128GB SD Card",
    "Surveillance Grade 256GB SD Card",
    "Surveillance Grade 512GB SD Card",
    "Surveillance Grade 64GB SD Card",
  ],
  "RFID Tags": [
    "2.4G Active Tag (Card Type) HX607",
    "2.4G RFID Animal Ear Tag",
  ],
  "RFID Reader": [
    "2.4 GHZ RFID Active Reader (Bus)",
    "2.4 GHZ RFID Active Reader (Campus)",
    "2.4G IOT Smart RFID Reader (ZR7901P)",
  ],
  "MDVR Accessories": [
    "10mt Cable",
    "15mt Cable",
    "1mt Cable",
    "2 way Communication Device",
    "3mt Cable",
    "4g M2M Sim Card with Internet Pack of 1 Year",
    "5mt Cable",
    "Alcohol Tester",
    "Cloud Storage Service",
    "MDVR Maintenance Tool",
    "MDVR Panic Button",
    "MDVR Remote",
    "MDVR Security Box",
    "MDVR Server",
    "MDVR Server Maintenance Charges",
    "MDVR Software Licence Fee",
    "RS 232 Adaptor",
    "Rod Type Fuel Sensor",
    "Ultra Sonic Fuel Sensor",
  ],
  "Other product and Accessories": [
    "Annual Maintenance Charges",
    "D link Wire Bundle",
    "GPS Installation",
    "Leaser Printer",
    "MDVR Connector",
    "MDVR Installation",
    "Parking Sensor",
    "Wireless Receiver Transmitter",
  ],
};

const ACCOUNTS = ["IDFC4828", "IDFC7455", "Canara", "Cash"];
const SALE_TYPES = ["With GST (18%)", "Without GST"];

export const NewSaleDialog = ({ open, onOpenChange }: NewSaleDialogProps) => {
  const { data: employees = [] } = useEmployees();
  const createSale = useCreateSale();
  const generateOrderId = useGenerateOrderId();

  const [orderId, setOrderId] = useState<string>("");
  const [isGeneratingOrderId, setIsGeneratingOrderId] = useState(false);

  const [formData, setFormData] = useState({
    customerCode: "",
    customerName: "",
    companyName: "",
    customerContact: "",
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

  // Customer auto-fill from Leads Database
  const lookupCustomer = useCallback(async (code: string) => {
    if (!code.trim()) {
      setCustomerNotFound(false);
      return;
    }

    setIsLookingUp(true);
    setCustomerNotFound(false);

    try {
      const { data, error } = await supabase
        .from("leads")
        .select("customer_name, mobile_number, company_name, location")
        .eq("customer_code", code.trim())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setFormData((prev) => ({
          ...prev,
          customerName: data.customer_name || prev.customerName,
          customerContact: data.mobile_number || prev.customerContact,
          companyName: data.company_name || prev.companyName,
          location: data.location || prev.location,
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

  // Debounced customer code lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.customerCode.trim()) {
        lookupCustomer(formData.customerCode);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.customerCode, lookupCustomer]);

  const addProduct = () => {
    if (products.length < 10) {
      setProducts([...products, { category: "", product_name: "", quantity: "", unit_price: "" }]);
    }
  };

  const removeProduct = (index: number) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index: number, field: keyof ProductItem, value: string | number) => {
    const updated = [...products];
    if (field === "category") {
      updated[index] = { ...updated[index], category: value as string, product_name: "" };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setProducts(updated);
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

    const saleTypeValue = isWithGST ? "With" : "Without";

    await createSale.mutateAsync({
      sale: {
        order_id: orderId,
        customer_code: formData.customerCode,
        customer_name: formData.customerName,
        company_name: formData.companyName,
        customer_contact: formData.customerContact,
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

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Row 1: Customer Code, Customer Name, Mobile Number */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="customerCode">Customer Code *</Label>
              <div className="relative">
                <Input
                  id="customerCode"
                  value={formData.customerCode}
                  onChange={(e) =>
                    setFormData({ ...formData, customerCode: e.target.value })
                  }
                  placeholder="Enter customer code"
                  required
                  className={customerNotFound ? "border-destructive" : ""}
                />
                {isLookingUp && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {customerNotFound && (
                <p className="text-xs text-destructive">Customer not found in database</p>
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

          {/* Row 2: Company Name, Location, Date of Sale */}
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

          {/* Row 3: Employee Name, Sale Type, Courier Cost */}
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
              <Label htmlFor="courierCost">
                Courier Cost
                {formData.courierCost > 0 && (
                  <span className="text-xs text-muted-foreground ml-1">
                    (+18% GST: ₹{courierGST.toFixed(2)})
                  </span>
                )}
              </Label>
              <Input
                id="courierCost"
                type="number"
                min="0"
                value={formData.courierCost || ""}
                onChange={(e) =>
                  setFormData({ ...formData, courierCost: Number(e.target.value) || 0 })
                }
                placeholder="0"
              />
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
                    {CATEGORIES.map((cat) => (
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
                    {(PRODUCTS_BY_CATEGORY[product.category] || []).map((p) => (
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
                
                <Input
                  type="number"
                  min="0"
                  value={product.unit_price}
                  onChange={(e) =>
                    updateProduct(index, "unit_price", e.target.value)
                  }
                  placeholder="Enter price"
                />
                
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
      </DialogContent>
    </Dialog>
  );
};
