import { useState, useEffect, useCallback } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateSale } from "@/hooks/useSales";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { Pencil, Plus, X, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

const CATEGORIES = [
  "MDVR", "Monitor & Monitor Kit", "Cameras", "Dashcam", "Storage",
  "RFID Tags", "RFID Reader", "MDVR Accessories", "Other product and Accessories",
];

const PRODUCTS_BY_CATEGORY: Record<string, string[]> = {
  "MDVR": [
    "4ch 1080p HDD MDVR (MR9704C)", "4ch 1080p HDD, 4G, GPS MDVR (MR9704E)",
    "4ch 1080p SD Card MDVR (MR9504EC)", "4ch 1080p SD, 4G, GPS MDVR (MR9504E)",
    "4ch 1080p SD, 4G, GPS MDVR (MR9504E-A3)", "4ch 1080p SD, 4G, wifi, GPS MDVR (MA9504ED)",
    "5ch MDVR HDD 4g + GPS + LAN + RS232 + RS485", "5ch MDVR SD 4g + GPS + LAN + RS232 + RS485",
    "8CH HDD MDVR", "8ch 4G + GPS MDVR",
    "AI MDVR with (DSM + ADAS) (SD+ 4g + GPS)", "AI MDVR with (DSM + ADAS) (SD+HDD+ 4g + GPS)",
    "TVS 4ch 1080p SD, 4G, GPS MDVR",
  ],
  "Monitor & Monitor Kit": [
    "4 inch AV monitor", "4k Recording monitor kit 2ch", "4k Recording monitor kit 4ch",
    "7\" AV Monitor", "7 inch Heavy Duty VGA Monitor", "7\" HDMI Monitor", "7\" VGA Monitor",
    "720 2ch Recording Monitor Kit",
  ],
  "Cameras": [
    "2 MP Heavy Duty Bullet Camera", "2 MP Heavy Duty Dome Camera", "2 MP IP Camera",
    "2 MP IR Outdoor Bullet Camera", "2 MP IR indoor Dome Camera", "2mp IP Dome Audio Camera",
    "2mp IR Audio Camera", "4k Monitor Camera", "720 Heavy Duty Bullet Camera",
    "ADAS Camera", "BSD Camera", "DFMS Camera", "PTZ Camera",
    "Replacement Bullet Camera 2mp", "Replacement Dome Audio Camera", "Replacement Dome Camera 2 mp",
    "Reverse Camera",
  ],
  "Dashcam": [
    "10 inch 2 Ch 4g, GPS, Android Dashcam", "10 inch 2 Ch Full Touch Dashcam",
    "2ch 4g Dashcam MT95L", "2k 12 inch Dashcam", "3ch 4g Dashcam with Rear Camera (MT95L-A3)",
    "3ch AI Dashcam ADAS + DSM (MT95C)", "4 Inch 2 Ch Dashcam", "4 inch 3 camera Dash Cam",
    "4 inch Android Dashcam", "4k Dashcam 12 inch", "wifi Dash Cam",
  ],
  "Storage": [
    "HDD 1 TB", "SD card Holder", "Surveillance Grade 128GB SD Card",
    "Surveillance Grade 256GB SD Card", "Surveillance Grade 512GB SD Card", "Surveillance Grade 64GB SD Card",
  ],
  "RFID Tags": ["2.4G Active Tag (Card Type) HX607", "2.4G RFID Animal Ear Tag"],
  "RFID Reader": [
    "2.4 GHZ RFID Active Reader (Bus)", "2.4 GHZ RFID Active Reader (Campus)",
    "2.4G IOT Smart RFID Reader (ZR7901P)",
  ],
  "MDVR Accessories": [
    "10mt Cable", "15mt Cable", "1mt Cable", "2 way Communication Device", "3mt Cable",
    "4g M2M Sim Card with Internet Pack of 1 Year", "5mt Cable", "Alcohol Tester",
    "Cloud Storage Service", "MDVR Maintenance Tool", "MDVR Panic Button", "MDVR Remote",
    "MDVR Security Box", "MDVR Server", "MDVR Server Maintenance Charges",
    "MDVR Software Licence Fee", "RS 232 Adaptor", "Rod Type Fuel Sensor", "Ultra Sonic Fuel Sensor",
  ],
  "Other product and Accessories": [
    "Annual Maintenance Charges", "D link Wire Bundle", "GPS Installation", "Leaser Printer",
    "MDVR Connector", "MDVR Installation", "Parking Sensor", "Wireless Receiver Transmitter",
  ],
};

const SALE_TYPES = ["With GST (18%)", "Without GST"];

interface ProductItem {
  category: string;
  product_name: string;
  quantity: string;
  unit_price: string;
}

interface EditSaleDialogProps {
  sale: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Find category for a product name
const findCategoryForProduct = (productName: string): string => {
  for (const [cat, products] of Object.entries(PRODUCTS_BY_CATEGORY)) {
    if (products.includes(productName)) return cat;
  }
  return "";
};

export const EditSaleDialog = ({ sale, open, onOpenChange }: EditSaleDialogProps) => {
  const { user } = useAuth();
  const { data: employees = [] } = useEmployees();
  const updateSale = useUpdateSale();
  const queryClient = useQueryClient();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  const [formData, setFormData] = useState({
    customerCode: "",
    customerName: "",
    companyName: "",
    customerContact: "",
    saleDate: "",
    employeeName: "",
    saleType: "",
    courierCost: 0,
    amountReceived: 0,
    remarks: "",
  });

  const [products, setProducts] = useState<ProductItem[]>([
    { category: "", product_name: "", quantity: "", unit_price: "" },
  ]);

  // Load sale data + items when dialog opens
  useEffect(() => {
    if (sale && open) {
      const saleTypeDisplay = sale.sale_type === "With" ? "With GST (18%)" : "Without GST";
      setFormData({
        customerCode: sale.customer_code || "",
        customerName: sale.customer_name || "",
        companyName: sale.company_name || "",
        customerContact: sale.customer_contact || "",
        saleDate: sale.sale_date ? new Date(sale.sale_date).toISOString().split("T")[0] : "",
        employeeName: sale.employee_name || "",
        saleType: saleTypeDisplay,
        courierCost: Number(sale.courier_cost) || 0,
        amountReceived: Number(sale.amount_received) || 0,
        remarks: sale.remarks || "",
      });

      // Fetch sale items
      setIsLoadingItems(true);
      supabase
        .from("sale_items")
        .select("*")
        .eq("order_id", sale.order_id)
        .then(({ data, error }) => {
          if (!error && data && data.length > 0) {
            setProducts(
              data.map((item: any) => ({
                category: findCategoryForProduct(item.product_name),
                product_name: item.product_name,
                quantity: String(item.quantity),
                unit_price: String(item.unit_price),
              }))
            );
          } else {
            setProducts([{ category: "", product_name: "", quantity: "", unit_price: "" }]);
          }
          setIsLoadingItems(false);
        });
    }
  }, [sale, open]);

  if (!sale) return null;

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

  const updateProduct = (index: number, field: keyof ProductItem, value: string) => {
    setProducts(prev => {
      const updated = [...prev];
      if (field === "category") {
        updated[index] = { ...updated[index], category: value, product_name: "" };
      } else {
        updated[index] = { ...updated[index], [field]: value };
      }
      return updated;
    });
  };

  // Calculations
  const subtotal = products.reduce((sum, p) => {
    const qty = parseFloat(p.quantity) || 0;
    const price = parseFloat(p.unit_price) || 0;
    return sum + qty * price;
  }, 0);
  const isWithGST = formData.saleType === "With GST (18%)";
  const courierGST = isWithGST ? formData.courierCost * 0.18 : 0;
  const productGST = isWithGST ? subtotal * 0.18 : 0;
  const totalGST = productGST + courierGST;
  const totalAmount = subtotal + formData.courierCost + totalGST;
  const balanceAmount = Math.max(0, totalAmount - formData.amountReceived);

  const handleSubmitClick = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.amountReceived < 0) {
      toast.error("Amount received cannot be negative");
      return;
    }
    setConfirmOpen(true);
  };

  const handleConfirmedSave = async () => {
    setConfirmOpen(false);
    if (!sale) return;

    const saleTypeValue = isWithGST ? "With" : "Without";

    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (formData.employeeName !== sale.employee_name) {
      oldValues.employee_name = sale.employee_name;
      newValues.employee_name = formData.employeeName;
    }
    if (saleTypeValue !== sale.sale_type) {
      oldValues.sale_type = sale.sale_type;
      newValues.sale_type = saleTypeValue;
    }
    if (formData.customerName !== (sale.customer_name || "")) {
      oldValues.customer_name = sale.customer_name;
      newValues.customer_name = formData.customerName;
    }
    if (formData.companyName !== (sale.company_name || "")) {
      oldValues.company_name = sale.company_name;
      newValues.company_name = formData.companyName;
    }
    if (formData.customerContact !== (sale.customer_contact || "")) {
      oldValues.customer_contact = sale.customer_contact;
      newValues.customer_contact = formData.customerContact;
    }
    if (formData.customerCode !== sale.customer_code) {
      oldValues.customer_code = sale.customer_code;
      newValues.customer_code = formData.customerCode;
    }
    if (formData.remarks !== (sale.remarks || "")) {
      oldValues.remarks = sale.remarks;
      newValues.remarks = formData.remarks;
    }

    // Always update calculated fields
    const updates: any = {
      ...newValues,
      subtotal,
      gst_amount: totalGST,
      courier_cost: formData.courierCost,
      total_amount: totalAmount,
      amount_received: formData.amountReceived,
      balance_amount: balanceAmount,
      sale_date: new Date(formData.saleDate).toISOString(),
      employee_name: formData.employeeName,
      sale_type: saleTypeValue,
      customer_code: formData.customerCode,
      customer_name: formData.customerName,
      company_name: formData.companyName,
      customer_contact: formData.customerContact,
      remarks: formData.remarks,
    };

    try {
      await updateSale.mutateAsync({ orderId: sale.order_id, updates });

      // Update sale items: delete old, insert new
      await supabase.from("sale_items").delete().eq("order_id", sale.order_id);
      const validItems = products.filter(p => p.product_name);
      if (validItems.length > 0) {
        await supabase.from("sale_items").insert(
          validItems.map(p => ({
            order_id: sale.order_id,
            product_name: p.product_name,
            quantity: parseFloat(p.quantity) || 0,
            unit_price: parseFloat(p.unit_price) || 0,
          }))
        );
      }

      // Log the edit
      await supabase.from("sale_edit_logs").insert({
        order_id: sale.order_id,
        edited_by: user?.id,
        edit_type: newValues.employee_name ? "employee_change" : "update",
        old_values: { ...oldValues, old_total: Number(sale.total_amount) },
        new_values: { ...newValues, new_total: totalAmount },
      });

      // If employee changed, send notification
      if (newValues.employee_name) {
        await createNotification(
          "Sale Reassigned",
          `Sale ${sale.order_id} reassigned from ${sale.employee_name} to ${formData.employeeName}`,
          "sale",
          { order_id: sale.order_id, old_employee: sale.employee_name, new_employee: formData.employeeName }
        );
      }

      queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update sale: ${error.message}`);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
          <DialogHeader className="border-b border-border pb-4">
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Sale - {sale.order_id}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmitClick} className="space-y-6 pt-4">
            {/* Customer Details */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Customer Code *</Label>
                <Input
                  value={formData.customerCode}
                  onChange={(e) => setFormData({ ...formData, customerCode: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Name</Label>
                <Input
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Mobile Number</Label>
                <Input
                  value={formData.customerContact}
                  onChange={(e) => setFormData({ ...formData, customerContact: e.target.value })}
                />
              </div>
            </div>

            {/* Company, Date, Employee */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Company Name</Label>
                <Input
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Sale Date *</Label>
                <Input
                  type="date"
                  value={formData.saleDate}
                  onChange={(e) => setFormData({ ...formData, saleDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Assigned Employee *</Label>
                <Select value={formData.employeeName} onValueChange={(v) => setFormData({ ...formData, employeeName: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.name}>{emp.name}</SelectItem>
                    ))}
                    {!employees.find(e => e.name === sale.employee_name) && (
                      <SelectItem value={sale.employee_name}>{sale.employee_name}</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Sale Type, Courier, Amount Received */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Sale Type *</Label>
                <Select value={formData.saleType} onValueChange={(v) => setFormData({ ...formData, saleType: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SALE_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>
                  Courier Cost
                  {formData.courierCost > 0 && isWithGST && (
                    <span className="text-xs text-muted-foreground ml-1">(+18% GST: ₹{courierGST.toFixed(2)})</span>
                  )}
                </Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.courierCost || ""}
                  onChange={(e) => setFormData({ ...formData, courierCost: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Amount Received</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.amountReceived || ""}
                  onChange={(e) => setFormData({ ...formData, amountReceived: Number(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-2">
              <Label>Remarks</Label>
              <Textarea
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                placeholder="Optional remarks"
                rows={2}
              />
            </div>

            {/* Product Details */}
            <div className="space-y-4">
              <h3 className="font-semibold text-foreground">Product Details</h3>

              {isLoadingItems ? (
                <div className="flex items-center gap-2 py-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading products...
                </div>
              ) : (
                <>
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
                        onValueChange={(v) => updateProduct(index, "category", v)}
                      >
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map((cat) => (
                            <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={product.product_name}
                        onValueChange={(v) => updateProduct(index, "product_name", v)}
                        disabled={!product.category}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={product.category ? "Select Product" : "Select Category First"} />
                        </SelectTrigger>
                        <SelectContent>
                          {(PRODUCTS_BY_CATEGORY[product.category] || []).map((p) => (
                            <SelectItem key={p} value={p}>{p}</SelectItem>
                          ))}
                          {/* Keep current product if not in list */}
                          {product.product_name && !(PRODUCTS_BY_CATEGORY[product.category] || []).includes(product.product_name) && (
                            <SelectItem value={product.product_name}>{product.product_name}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>

                      <Input
                        type="number"
                        min="0"
                        value={product.quantity}
                        onChange={(e) => updateProduct(index, "quantity", e.target.value)}
                        placeholder="Qty"
                      />

                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={product.unit_price}
                        onChange={(e) => updateProduct(index, "unit_price", e.target.value)}
                        placeholder="Price"
                      />

                      <Input
                        readOnly
                        value={
                          product.quantity && product.unit_price
                            ? ((parseFloat(product.quantity) || 0) * (parseFloat(product.unit_price) || 0)).toFixed(2)
                            : ""
                        }
                        className="bg-muted"
                        placeholder="Total"
                      />

                      <Button type="button" variant="destructive" size="icon" onClick={() => removeProduct(index)} className="h-10 w-10">
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button type="button" variant="default" size="sm" onClick={addProduct} disabled={products.length >= 10}>
                    <Plus className="mr-1 h-4 w-4" /> Add Product
                  </Button>
                </>
              )}
            </div>

            {/* Totals */}
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
            <div className="flex justify-end gap-3 pt-2 border-t border-border">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={updateSale.isPending}>
                {updateSale.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Sale Update</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to update this sale? This will recalculate totals, GST, and balance amounts.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedSave}>Yes, Update Sale</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
