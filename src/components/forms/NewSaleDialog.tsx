import { useState, useEffect } from "react";
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
  product_name: string;
  quantity: number;
  unit_price: number;
}

const PRODUCTS = ["MDVR", "Dashcam", "Camera", "GPS Tracker", "4ch 1080p HDD", "4G GPS MDVR"];
const ACCOUNTS = ["IDFC4828", "IDFC7455", "Canara", "Cash"];

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
    saleType: "Without" as "With" | "Without",
    courierCost: 0,
    amountReceived: 0,
    accountReceived: "Cash",
    paymentReference: "",
    remarks: "",
  });

  const [products, setProducts] = useState<ProductItem[]>([
    { product_name: "", quantity: 1, unit_price: 0 },
  ]);

  const addProduct = () => {
    if (products.length < 10) {
      setProducts([...products, { product_name: "", quantity: 1, unit_price: 0 }]);
    }
  };

  const removeProduct = (index: number) => {
    setProducts(products.filter((_, i) => i !== index));
  };

  const updateProduct = (index: number, field: keyof ProductItem, value: string | number) => {
    const updated = [...products];
    updated[index] = { ...updated[index], [field]: value };
    setProducts(updated);
  };

  const subtotal = products.reduce((sum, p) => sum + p.quantity * p.unit_price, 0);
  const gstAmount = formData.saleType === "With" ? (subtotal + formData.courierCost) * 0.18 : 0;
  const totalAmount = subtotal + formData.courierCost + gstAmount;
  const balanceAmount = totalAmount - formData.amountReceived;

  const generateOrderId = () => {
    const timestamp = Date.now().toString().slice(-6);
    return `ORD${2019947 + Math.floor(Math.random() * 1000)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerCode || !formData.employeeName) {
      return;
    }

    const orderId = generateOrderId();

    await createSale.mutateAsync({
      sale: {
        order_id: orderId,
        customer_code: formData.customerCode,
        customer_name: formData.customerName,
        company_name: formData.companyName,
        customer_contact: formData.customerContact,
        sale_date: new Date(formData.saleDate).toISOString(),
        employee_name: formData.employeeName,
        sale_type: formData.saleType,
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
      saleType: "Without",
      courierCost: 0,
      amountReceived: 0,
      accountReceived: "Cash",
      paymentReference: "",
      remarks: "",
    });
    setProducts([{ product_name: "", quantity: 1, unit_price: 0 }]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">New Sale</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Customer Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
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
                <Label htmlFor="customerName">Customer Name</Label>
                <Input
                  id="customerName"
                  value={formData.customerName}
                  onChange={(e) =>
                    setFormData({ ...formData, customerName: e.target.value })
                  }
                  placeholder="Enter customer name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) =>
                    setFormData({ ...formData, companyName: e.target.value })
                  }
                  placeholder="Enter company name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerContact">Contact Number</Label>
                <Input
                  id="customerContact"
                  value={formData.customerContact}
                  onChange={(e) =>
                    setFormData({ ...formData, customerContact: e.target.value })
                  }
                  placeholder="Enter contact number"
                />
              </div>
            </div>
          </div>

          {/* Sale Information */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Sale Information</h3>
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
              <div className="space-y-2">
                <Label htmlFor="employeeName">Employee *</Label>
                <Select
                  value={formData.employeeName}
                  onValueChange={(value) =>
                    setFormData({ ...formData, employeeName: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employee" />
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
                <Label htmlFor="saleType">Sale Type</Label>
                <Select
                  value={formData.saleType}
                  onValueChange={(value: "With" | "Without") =>
                    setFormData({ ...formData, saleType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="With">With GST (18%)</SelectItem>
                    <SelectItem value="Without">Without GST</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Products */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Products</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addProduct}
                disabled={products.length >= 10}
              >
                <Plus className="mr-1 h-4 w-4" />
                Add Product
              </Button>
            </div>

            {products.map((product, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label>Product</Label>
                  <Select
                    value={product.product_name}
                    onValueChange={(value) =>
                      updateProduct(index, "product_name", value)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {PRODUCTS.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-24 space-y-2">
                  <Label>Qty</Label>
                  <Input
                    type="number"
                    min="1"
                    value={product.quantity}
                    onChange={(e) =>
                      updateProduct(index, "quantity", Number(e.target.value))
                    }
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Unit Price</Label>
                  <Input
                    type="number"
                    min="0"
                    value={product.unit_price}
                    onChange={(e) =>
                      updateProduct(index, "unit_price", Number(e.target.value))
                    }
                  />
                </div>
                <div className="w-32 space-y-2">
                  <Label>Total</Label>
                  <Input
                    readOnly
                    value={`₹${(product.quantity * product.unit_price).toLocaleString()}`}
                    className="bg-muted"
                  />
                </div>
                {products.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => removeProduct(index)}
                    className="text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Payment Details */}
          <div className="space-y-4">
            <h3 className="font-semibold text-foreground">Payment Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
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
              <div className="space-y-2">
                <Label htmlFor="accountReceived">Account</Label>
                <Select
                  value={formData.accountReceived}
                  onValueChange={(value) =>
                    setFormData({ ...formData, accountReceived: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
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
                <Label htmlFor="paymentReference">Payment Reference</Label>
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
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              placeholder="Add any notes..."
              rows={3}
            />
          </div>

          {/* Totals */}
          <div className="rounded-lg bg-secondary p-4">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">₹{subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Courier Cost:</span>
                <span className="font-medium">₹{formData.courierCost.toLocaleString()}</span>
              </div>
              {formData.saleType === "With" && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">GST (18%):</span>
                  <span className="font-medium">₹{gstAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-semibold">
                <span>Total Amount:</span>
                <span className="text-primary">₹{totalAmount.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground">Balance:</span>
                <span className={balanceAmount > 0 ? "text-destructive" : "text-success"}>
                  ₹{balanceAmount.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
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
              className="bg-[image:var(--gradient-primary)]"
            >
              {createSale.isPending ? "Saving..." : "Save Sale"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
