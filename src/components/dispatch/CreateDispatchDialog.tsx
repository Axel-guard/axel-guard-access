import { useState, useEffect, useCallback, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Truck, 
  Info, 
  Package, 
  Barcode, 
  CheckCircle2, 
  X, 
  ArrowLeft, 
  Send,
  AlertTriangle,
  Plus,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, addDays } from "date-fns";
import type { Sale, SaleItem } from "@/hooks/useSales";
import { useQueryClient } from "@tanstack/react-query";
import { createNotification } from "@/hooks/useNotifications";
import { useEmail } from "@/hooks/useEmail";

// Service products that don't require inventory (digital products)
const SERVICE_PRODUCTS = ["Server Charges", "Cloud Charges", "SIM Charges"];

// Check if a product is a service/digital product
const isServiceProduct = (productName: string): boolean => {
  const lowerName = productName.toLowerCase();
  return SERVICE_PRODUCTS.some(sp => 
    lowerName.includes(sp.toLowerCase().replace(" charges", "").trim()) ||
    lowerName.includes("server charges") ||
    lowerName.includes("cloud charges") ||
    lowerName.includes("sim charges")
  );
};

interface ProductToDispatch {
  product_name: string;
  category: string | null;
  required_qty: number;
  scanned_qty: number;
  scanned_serials: string[];
  isServiceProduct: boolean;
}

interface ScannedDevice {
  serial_number: string;
  product_name: string;
  category: string | null;
}

interface CreateDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Sale | null;
  orderItems: SaleItem[];
}

const COURIER_PARTNERS = ["Trackon", "DTDC", "Porter", "Self Pick", "By Bus"];
const DISPATCH_METHODS = ["Surface", "Air", "Local Delivery"];

export const CreateDispatchDialog = ({
  open,
  onOpenChange,
  order,
  orderItems,
}: CreateDispatchDialogProps) => {
  const queryClient = useQueryClient();
  const scanInputRef = useRef<HTMLInputElement>(null);
  const { sendDispatchEmail } = useEmail();
  
  const [step, setStep] = useState<"scan" | "details">("scan");
  const [serialInput, setSerialInput] = useState("");
  const [scannedDevices, setScannedDevices] = useState<ScannedDevice[]>([]);
  const [productsToDispatch, setProductsToDispatch] = useState<ProductToDispatch[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  
  // Dispatch details
  const [dispatchDate, setDispatchDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [courierPartner, setCourierPartner] = useState("");
  const [dispatchMethod, setDispatchMethod] = useState("");
  const [notes, setNotes] = useState("");

  // Initialize products to dispatch from order items
  useEffect(() => {
    if (orderItems.length > 0) {
      const products = orderItems.map(item => {
        const isService = isServiceProduct(item.product_name);
        return {
          product_name: item.product_name,
          category: null as string | null,
          required_qty: item.quantity,
          // Service products are auto-completed (no scanning needed)
          scanned_qty: isService ? item.quantity : 0,
          scanned_serials: [] as string[],
          isServiceProduct: isService,
        };
      });
      setProductsToDispatch(products);
    }
  }, [orderItems]);

  // Fetch categories for products
  useEffect(() => {
    const fetchCategories = async () => {
      if (orderItems.length === 0) return;
      
      const productNames = orderItems.map(item => item.product_name);
      const { data } = await supabase
        .from("products")
        .select("product_name, category")
        .in("product_name", productNames);
      
      if (data) {
        setProductsToDispatch(prev => 
          prev.map(product => {
            const found = data.find(p => p.product_name === product.product_name);
            return { 
              ...product, 
              category: found?.category || (product.isServiceProduct ? "Digital Service" : null)
            };
          })
        );
      }
    };
    
    fetchCategories();
  }, [orderItems]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (!open) {
      setStep("scan");
      setSerialInput("");
      setScannedDevices([]);
      setDispatchDate(format(new Date(), "yyyy-MM-dd"));
      setCourierPartner("");
      setDispatchMethod("");
      setNotes("");
    }
  }, [open]);

  // Calculate if all items are scanned (service products are auto-complete)
  const allItemsScanned = productsToDispatch.length > 0 && 
    productsToDispatch.every(p => p.isServiceProduct || p.scanned_qty >= p.required_qty);

  const totalRequired = productsToDispatch.reduce((sum, p) => sum + p.required_qty, 0);
  // Count physical scanned devices + service product quantities
  const totalScanned = scannedDevices.length + 
    productsToDispatch.filter(p => p.isServiceProduct).reduce((sum, p) => sum + p.required_qty, 0);
  
  // Check if order has only service products (no physical items)
  const hasOnlyServiceProducts = productsToDispatch.length > 0 && 
    productsToDispatch.every(p => p.isServiceProduct);
  
  // Physical products that need scanning
  const physicalProducts = productsToDispatch.filter(p => !p.isServiceProduct);
  const serviceProducts = productsToDispatch.filter(p => p.isServiceProduct);

  // Handle barcode scan/add
  const handleAddDevice = useCallback(async () => {
    const serial = serialInput.trim();
    if (!serial) {
      toast.error("Please enter a serial number");
      return;
    }

    // Check if already scanned
    if (scannedDevices.some(d => d.serial_number === serial)) {
      toast.error("This device is already scanned");
      setSerialInput("");
      return;
    }

    // Lookup device in inventory
    const { data: inventoryItem, error } = await supabase
      .from("inventory")
      .select("serial_number, product_name, category, status")
      .eq("serial_number", serial)
      .maybeSingle();

    if (error) {
      toast.error("Error looking up device");
      return;
    }

    if (!inventoryItem) {
      toast.error("Device not found in inventory");
      setSerialInput("");
      return;
    }

    if (inventoryItem.status === "Dispatched") {
      toast.error("Device is already dispatched");
      setSerialInput("");
      return;
    }

    // Check if product matches any required product
    const productIndex = productsToDispatch.findIndex(
      p => p.product_name === inventoryItem.product_name && p.scanned_qty < p.required_qty
    );

    if (productIndex === -1) {
      // Check if product is in order but already fully scanned
      const fullProduct = productsToDispatch.find(
        p => p.product_name === inventoryItem.product_name
      );
      if (fullProduct) {
        toast.error(`All ${inventoryItem.product_name} units already scanned`);
      } else {
        toast.error("This product is not in the order");
      }
      setSerialInput("");
      return;
    }

    // Add to scanned devices
    setScannedDevices(prev => [...prev, {
      serial_number: inventoryItem.serial_number,
      product_name: inventoryItem.product_name,
      category: inventoryItem.category,
    }]);

    // Update product count
    setProductsToDispatch(prev => 
      prev.map((p, i) => 
        i === productIndex 
          ? { 
              ...p, 
              scanned_qty: p.scanned_qty + 1,
              scanned_serials: [...p.scanned_serials, serial]
            } 
          : p
      )
    );

    toast.success(`Added: ${inventoryItem.product_name}`);
    setSerialInput("");
    scanInputRef.current?.focus();
  }, [serialInput, scannedDevices, productsToDispatch]);

  // Handle Enter key for scanning
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddDevice();
    }
  };

  // Remove scanned device
  const handleRemoveDevice = (serial: string) => {
    const device = scannedDevices.find(d => d.serial_number === serial);
    if (!device) return;

    setScannedDevices(prev => prev.filter(d => d.serial_number !== serial));
    setProductsToDispatch(prev =>
      prev.map(p => 
        p.product_name === device.product_name
          ? {
              ...p,
              scanned_qty: Math.max(0, p.scanned_qty - 1),
              scanned_serials: p.scanned_serials.filter(s => s !== serial)
            }
          : p
      )
    );
  };

  // Add all devices for a product (bulk add)
  const handleAddAllForProduct = async (productName: string) => {
    const product = productsToDispatch.find(p => p.product_name === productName);
    if (!product) return;

    const remainingNeeded = product.required_qty - product.scanned_qty;
    if (remainingNeeded <= 0) return;

    // Fetch available inventory for this product
    const { data: availableItems, error } = await supabase
      .from("inventory")
      .select("serial_number, product_name, category")
      .eq("product_name", productName)
      .eq("status", "In Stock")
      .limit(remainingNeeded);

    if (error) {
      toast.error("Error fetching inventory");
      return;
    }

    if (!availableItems || availableItems.length === 0) {
      toast.error("No available stock for this product");
      return;
    }

    // Filter out already scanned
    const newItems = availableItems.filter(
      item => !scannedDevices.some(d => d.serial_number === item.serial_number)
    );

    if (newItems.length === 0) {
      toast.error("All available items already scanned");
      return;
    }

    // Add all to scanned devices
    setScannedDevices(prev => [...prev, ...newItems.map(item => ({
      serial_number: item.serial_number,
      product_name: item.product_name,
      category: item.category,
    }))]);

    // Update product count
    setProductsToDispatch(prev =>
      prev.map(p =>
        p.product_name === productName
          ? {
              ...p,
              scanned_qty: p.scanned_qty + newItems.length,
              scanned_serials: [...p.scanned_serials, ...newItems.map(i => i.serial_number)]
            }
          : p
      )
    );

    toast.success(`Added ${newItems.length} ${productName} items`);
  };

  // Handle final dispatch confirmation
  const handleCreateDispatch = async () => {
    if (!order) return;
    
    setIsProcessing(true);
    try {
      // Only update inventory for physical products (scanned devices)
      const serialNumbers = scannedDevices.map(d => d.serial_number);
      
      if (serialNumbers.length > 0) {
        const { error: inventoryError } = await supabase
          .from("inventory")
          .update({
            status: "Dispatched",
            dispatch_date: dispatchDate,
            order_id: order.order_id,
            customer_code: order.customer_code,
            customer_name: order.customer_name,
          })
          .in("serial_number", serialNumbers);

        if (inventoryError) throw inventoryError;
      }

      // Create shipment record (for both physical and service products)
      const shipmentType = hasOnlyServiceProducts ? "Service Activation" : "Outbound";
      const { error: shipmentError } = await supabase
        .from("shipments")
        .insert({
          order_id: order.order_id,
          shipment_type: shipmentType,
          courier_partner: hasOnlyServiceProducts ? "N/A" : (courierPartner || null),
          shipping_mode: hasOnlyServiceProducts ? "Digital" : (dispatchMethod || null),
          weight_kg: null,
          shipping_cost: hasOnlyServiceProducts ? 0 : (order.courier_cost || null),
        });

      if (shipmentError) throw shipmentError;

      // Check for renewal products (service products) and create renewal records
      const renewalProducts = productsToDispatch.filter(product => product.isServiceProduct);

      if (renewalProducts.length > 0) {
        const dispatchDateObj = new Date(dispatchDate);
        const renewalEndDate = addDays(dispatchDateObj, 364);

        const renewalRecords = renewalProducts.map(product => ({
          order_id: order.order_id,
          customer_code: order.customer_code || null,
          customer_name: order.customer_name || null,
          company_name: order.company_name || null,
          product_type: product.product_name.toLowerCase().includes("server") 
            ? "Server Charges" 
            : product.product_name.toLowerCase().includes("cloud")
            ? "Cloud Charges"
            : "SIM Charges",
          product_name: product.product_name,
          dispatch_date: dispatchDateObj.toISOString(),
          renewal_start_date: dispatchDateObj.toISOString(),
          renewal_end_date: renewalEndDate.toISOString(),
          status: "Active",
        }));

        const { error: renewalError } = await supabase
          .from("renewals")
          .insert(renewalRecords);

        if (renewalError) {
          console.error("Failed to create renewal records:", renewalError);
        } else {
          toast.success(`Created ${renewalRecords.length} renewal record(s) with 364-day cycle`);
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["shipments"] });
      queryClient.invalidateQueries({ queryKey: ["shipments-summary"] });
      queryClient.invalidateQueries({ queryKey: ["renewals"] });
      queryClient.invalidateQueries({ queryKey: ["renewals-summary"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-inventory-status"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-sale-items"] });
      queryClient.invalidateQueries({ queryKey: ["dispatch-status-current-month"] });

      // Create notification for admins
      const dispatchMessage = hasOnlyServiceProducts
        ? `Service activated for order ${order.order_id} - ${serviceProducts.length} service(s).`
        : serialNumbers.length > 0
        ? `Dispatch completed - Order ${order.order_id}: ${serialNumbers.length} devices dispatched${serviceProducts.length > 0 ? ` + ${serviceProducts.length} service(s)` : ""}.`
        : `Dispatch completed for order ${order.order_id}.`;
      
      createNotification(
        "Dispatch Completed",
        dispatchMessage,
        "dispatch",
        { order_id: order.order_id, devices_count: serialNumbers.length }
      );

    // Success message based on product type
      if (hasOnlyServiceProducts) {
        toast.success(`Service activated for order ${order.order_id}!`);
      } else if (serviceProducts.length > 0) {
        toast.success(`Dispatch completed! ${serialNumbers.length} devices dispatched + ${serviceProducts.length} service(s) activated.`);
      } else {
        toast.success(`Dispatch completed! ${serialNumbers.length} devices dispatched.`);
      }

    // Send dispatch email automatically (non-blocking)
    const productNames = productsToDispatch.map(p => p.product_name).join(", ");
    const totalQty = productsToDispatch.reduce((sum, p) => sum + p.required_qty, 0);
    
    sendDispatchEmail(order.order_id, {
      dispatchDate: format(new Date(dispatchDate), "dd/MM/yyyy"),
      serialNumbers,
      productName: productNames,
      totalQuantity: totalQty,
    }).catch(emailError => {
      console.error("Failed to send dispatch email:", emailError);
    });

      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to dispatch: ${error.message}`);
    } finally {
      setIsProcessing(false);
      setShowConfirmDialog(false);
    }
  };

  if (!order) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl h-[90vh] max-h-[90vh] p-0 overflow-hidden flex flex-col">
          <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Truck className="h-6 w-6 text-primary" />
              Create Dispatch
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            <div className="space-y-6 pb-4">
              {/* Order Details Header */}
              <div className="bg-gradient-to-r from-primary to-primary/80 rounded-xl p-5 text-primary-foreground">
                <div className="flex items-center gap-2 mb-3">
                  <Info className="h-5 w-5" />
                  <span className="font-semibold">Order Details</span>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-primary-foreground/70">Order ID</p>
                    <p className="font-bold text-lg">{order.order_id.replace("ORD", "")}</p>
                  </div>
                  <div>
                    <p className="text-sm text-primary-foreground/70">Customer</p>
                    <p className="font-semibold">{order.customer_name || "-"}</p>
                    <p className="text-sm text-primary-foreground/70">{order.company_name || ""}</p>
                  </div>
                  <div>
                    <p className="text-sm text-primary-foreground/70">Order Date</p>
                    <p className="font-semibold">
                      {order.sale_date ? format(new Date(order.sale_date), "yyyy-MM-dd") : "-"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Service Products (Digital) */}
              {serviceProducts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2 text-primary">
                    <CheckCircle2 className="h-5 w-5" />
                    Digital Service Products
                    <Badge className="bg-primary/10 text-primary border-primary/20">No Stock Required</Badge>
                  </h3>
                  <div className="space-y-3">
                    {serviceProducts.map((product, index) => (
                      <div
                        key={`service-${index}`}
                        className="p-4 rounded-lg border-2 border-primary/30 bg-primary/5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{product.product_name}</p>
                            <Badge className="mt-1 bg-primary/10 text-primary border-primary/20 text-xs">
                              Digital Service Product
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="text-lg font-bold text-success">
                                {product.required_qty} / {product.required_qty}
                              </p>
                              <p className="text-sm text-success flex items-center gap-1">
                                <CheckCircle2 className="h-3 w-3" />
                                Service Activated
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Physical Products to Dispatch */}
              {physicalProducts.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Physical Products to Dispatch
                    <Badge variant="outline" className="text-xs">Stock Required</Badge>
                  </h3>
                  <div className="space-y-3">
                    {physicalProducts.map((product, index) => {
                      const remaining = product.required_qty - product.scanned_qty;
                      const isComplete = remaining <= 0;
                      
                      return (
                        <div
                          key={`physical-${index}`}
                          className={`p-4 rounded-lg border-2 transition-colors ${
                            isComplete 
                              ? "border-success/30 bg-success/5" 
                              : "border-border bg-card"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{product.product_name}</p>
                              <p className="text-sm text-muted-foreground">
                                Category: {product.category || "Uncategorized"}
                              </p>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className={`text-lg font-bold ${isComplete ? "text-success" : "text-warning"}`}>
                                  {product.scanned_qty} / {product.required_qty}
                                </p>
                                <p className={`text-sm ${isComplete ? "text-success" : "text-warning"}`}>
                                  {isComplete ? "Complete" : `${remaining} Remaining`}
                                </p>
                              </div>
                              {!isComplete && (
                                <Button
                                  size="sm"
                                  className="gap-1 bg-primary"
                                  onClick={() => handleAddAllForProduct(product.product_name)}
                                >
                                  <Plus className="h-3 w-3" />
                                  Add All
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Barcode Scanner Section - Only show if there are physical products */}
              {physicalProducts.length > 0 && (
                <div className="border-2 border-dashed border-success/50 rounded-xl p-5 bg-success/5">
                  <h3 className="font-semibold flex items-center gap-2 text-success mb-4">
                    <Barcode className="h-5 w-5" />
                    Scan Products (Barcode Scanner Ready)
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="serial-scan">Scan Device Serial Number</Label>
                      <Input
                        id="serial-scan"
                        ref={scanInputRef}
                        placeholder="Scan barcode or type serial number..."
                        value={serialInput}
                        onChange={(e) => setSerialInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="mt-1"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 gap-2 bg-success hover:bg-success/90"
                        onClick={handleAddDevice}
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Add Device
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1 gap-2"
                        onClick={() => setSerialInput("")}
                      >
                        <X className="h-4 w-4" />
                        Clear
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {/* Scanned Devices List - Only show if there are physical products */}
              {physicalProducts.length > 0 && (
                <div className="border rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Scanned Devices
                    </h3>
                    <Badge className="bg-primary">{scannedDevices.length} Scanned</Badge>
                  </div>
                  
                  {scannedDevices.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">
                      No devices scanned yet. Start scanning barcodes...
                    </p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {scannedDevices.map((device) => (
                        <div
                          key={device.serial_number}
                          className="flex items-center justify-between p-2 bg-muted/50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-sm">{device.serial_number}</p>
                            <p className="text-xs text-muted-foreground">{device.product_name}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleRemoveDevice(device.serial_number)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Service-only dispatch notice */}
              {hasOnlyServiceProducts && (
                <div className="border-2 border-primary/30 rounded-xl p-5 bg-primary/5">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-8 w-8 text-success" />
                    <div>
                      <h3 className="font-semibold text-lg">Ready for Service Activation</h3>
                      <p className="text-sm text-muted-foreground">
                        This order contains only digital service products. No physical inventory scanning required.
                        Click "Create Dispatch" to activate services and start the renewal cycle.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Dispatch Details */}
              <div className="space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <Truck className="h-5 w-5" />
                  Dispatch Details
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="dispatch-date">Dispatch Date *</Label>
                    <Input
                      id="dispatch-date"
                      type="date"
                      value={dispatchDate}
                      onChange={(e) => setDispatchDate(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Courier Company</Label>
                    <Select value={courierPartner} onValueChange={setCourierPartner}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select Courier" />
                      </SelectTrigger>
                      <SelectContent>
                        {COURIER_PARTNERS.map((partner) => (
                          <SelectItem key={partner} value={partner}>
                            {partner}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Dispatch Method</Label>
                    <Select value={dispatchMethod} onValueChange={setDispatchMethod}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select Method" />
                      </SelectTrigger>
                      <SelectContent>
                        {DISPATCH_METHODS.map((method) => (
                          <SelectItem key={method} value={method}>
                            {method}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Notes</Label>
                    <Textarea
                      placeholder="Optional notes"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="mt-1 h-10"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Actions - Sticky */}
          <div className="border-t px-6 py-4 bg-background shrink-0 flex gap-3">
            <Button
              variant="outline"
              className="flex-1 gap-2"
              onClick={() => onOpenChange(false)}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Order Selection
            </Button>
            <Button
              className={`flex-1 gap-2 ${allItemsScanned ? "bg-success hover:bg-success/90" : "bg-muted text-muted-foreground"}`}
              disabled={!allItemsScanned || isProcessing}
              onClick={() => setShowConfirmDialog(true)}
            >
              <Send className="h-4 w-4" />
              {hasOnlyServiceProducts 
                ? `Activate Service (${serviceProducts.length} item${serviceProducts.length > 1 ? 's' : ''})`
                : `Create Dispatch (${scannedDevices.length} devices${serviceProducts.length > 0 ? ` + ${serviceProducts.length} service${serviceProducts.length > 1 ? 's' : ''}` : ''})`
              }
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              {hasOnlyServiceProducts ? "Confirm Service Activation" : "Confirm Dispatch"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {hasOnlyServiceProducts ? (
                <>
                  <p>You are about to activate <strong>{serviceProducts.length}</strong> service(s) for order <strong>{order?.order_id}</strong>.</p>
                  <p>This action will:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>Activate digital service products</li>
                    <li>Start <strong>364-day</strong> renewal countdown</li>
                    <li>Create renewal tracking records</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>You are about to dispatch for order <strong>{order?.order_id}</strong>.</p>
                  <p>This action will:</p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    {scannedDevices.length > 0 && (
                      <>
                        <li>Mark <strong>{scannedDevices.length}</strong> devices as <strong>Dispatched</strong></li>
                        <li>Update inventory with customer and order details</li>
                      </>
                    )}
                    <li>Create a shipment record</li>
                    {serviceProducts.length > 0 && (
                      <li>Activate <strong>{serviceProducts.length}</strong> digital service(s) with 364-day renewal cycle</li>
                    )}
                  </ul>
                </>
              )}
              <p className="mt-3 font-medium">This action cannot be undone. Are you sure?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCreateDispatch}
              disabled={isProcessing}
              className="bg-success hover:bg-success/90"
            >
              {isProcessing ? "Processing..." : (hasOnlyServiceProducts ? "Confirm Activation" : "Confirm Dispatch")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
