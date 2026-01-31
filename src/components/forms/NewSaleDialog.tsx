import { useState } from "react";
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
import { Plus, X } from "lucide-react";
import { useEmployees } from "@/hooks/useEmployees";
import { useCreateSale } from "@/hooks/useSales";

interface NewSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProductItem {
  category: string;
  product_name: string;
  quantity: number;
  unit_price: number;
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
    "7 inch Monitor",
    "10 inch Monitor",
    "Monitor Kit with Cables",
  ],
  "Cameras": [
    "AHD Camera 720p",
    "AHD Camera 1080p",
    "IP Camera 2MP",
    "IP Camera 5MP",
    "PTZ Camera",
  ],
  "Dashcam": [
    "Single Lens Dashcam",
    "Dual Lens Dashcam",
    "4G Dashcam",
    "GPS Dashcam",
  ],
  "Storage": [
    "64GB SD Card",
    "128GB SD Card",
    "256GB SD Card",
    "512GB SD Card",
    "1TB HDD",
    "2TB HDD",
  ],
  "RFID Tags": [
    "RFID Tag - Standard",
    "RFID Tag - Heavy Duty",
  ],
  "RFID Reader": [
    "RFID Reader - USB",
    "RFID Reader - Wireless",
  ],
  "MDVR Accessories": [
    "Power Cable",
    "Video Cable",
    "Extension Cable",
    "Mounting Bracket",
    "GPS Antenna",
    "4G Antenna",
  ],
  "Other product and Accessories": [
    "GPS Tracker",
    "OBD Device",
    "Fuel Sensor",
    "Temperature Sensor",
  ],
};

const ACCOUNTS = ["IDFC4828", "IDFC7455", "Canara", "Cash"];
const SALE_TYPES = ["With GST (18%)", "Without GST"];

export const NewSaleDialog = ({ open, onOpenChange }: NewSaleDialogProps) => {
  const { data: employees = [] } = useEmployees();
  const createSale = useCreateSale();

  const [formData, setFormData] = useState({
    customerCode: "",
    customerName: "",
    companyName: "",
    customerContact: "",
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
    { category: "", product_name: "", quantity: 0, unit_price: 0 },
  ]);

  const addProduct = () => {
    if (products.length < 10) {
      setProducts([...products, { category: "", product_name: "", quantity: 0, unit_price: 0 }]);
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

  const subtotal = products.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);
  const isWithGST = formData.saleType === "With GST (18%)";
  const gstAmount = isWithGST ? (subtotal + formData.courierCost) * 0.18 : 0;
  const totalAmount = subtotal + formData.courierCost + gstAmount;
  const balanceAmount = totalAmount - formData.amountReceived;

  const generateOrderId = () => {
    return `ORD${2019947 + Math.floor(Math.random() * 1000)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerCode || !formData.employeeName || !formData.saleType) {
      return;
    }

    const orderId = generateOrderId();
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
        gst_amount: gstAmount,
        total_amount: totalAmount,
        balance_amount: balanceAmount,
      },
      items: products
        .filter((p) => p.product_name)
        .map((p) => ({
          order_id: orderId,
          product_name: p.product_name,
          quantity: p.quantity,
          unit_price: p.unit_price,
        })),
    });

    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerCode: "",
      customerName: "",
      companyName: "",
      customerContact: "",
      saleDate: new Date().toISOString().split("T")[0],
      employeeName: "",
      saleType: "",
      courierCost: 0,
      amountReceived: 0,
      accountReceived: "",
      paymentReference: "",
      remarks: "",
    });
    setProducts([{ category: "", product_name: "", quantity: 0, unit_price: 0 }]);
  };

  const AutoFillHint = () => (
    <span className="text-xs font-normal ml-1" style={{ color: '#f97316' }}>(Auto-filled or enter manually)</span>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle className="text-xl font-bold">Add New Sale</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          {/* Row 1: Customer Code, Customer Name, Mobile Number */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="customerCode">Customer Code *</Label>
              <Input
                id="customerCode"
                value={formData.customerCode}
                onChange={(e) =>
                  setFormData({ ...formData, customerCode: e.target.value })
                }
                placeholder="Enter customer code"
                required
              />
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

          {/* Row 2: Company Name, Date of Sale, Employee Name */}
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
          </div>

          {/* Row 3: Sale Type, Courier Cost, Amount Received */}
          <div className="grid gap-4 md:grid-cols-3">
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
              <Label htmlFor="courierCost">Courier Cost</Label>
              <Input
                id="courierCost"
                type="number"
                min="0"
                value={formData.courierCost}
                onChange={(e) =>
                  setFormData({ ...formData, courierCost: Number(e.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="amountReceived">Amount Received</Label>
              <Input
                id="amountReceived"
                type="number"
                min="0"
                value={formData.amountReceived}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    amountReceived: Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Row 4: In Account Received, Payment Reference Number, Remarks */}
          <div className="grid gap-4 md:grid-cols-3">
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
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Textarea
                id="remarks"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Add any additional notes"
                rows={3}
              />
            </div>
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
                    updateProduct(index, "quantity", Number(e.target.value))
                  }
                />
                
                <Input
                  type="number"
                  min="0"
                  value={product.unit_price}
                  onChange={(e) =>
                    updateProduct(index, "unit_price", Number(e.target.value))
                  }
                />
                
                <Input
                  readOnly
                  value={product.quantity * product.unit_price}
                  className="bg-muted"
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
              <span className="text-muted-foreground">Subtotal:</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Courier Cost:</span>
              <span className="font-medium">₹{formData.courierCost.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">GST (18%):</span>
              <span className="font-medium">₹{gstAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-base font-semibold border-t border-primary pt-2">
              <span className="text-primary">Total Amount:</span>
              <span className="text-primary">₹{totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Balance:</span>
              <span className={balanceAmount > 0 ? "text-destructive font-medium" : "text-green-600 font-medium"}>
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
