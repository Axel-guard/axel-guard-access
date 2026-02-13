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

// Check if a product is a service/digital product using product_type from DB
const isServiceProduct = async (productName: string): Promise<boolean> => {
  const { data } = await supabase
    .from("products")
    .select("product_type")
    .eq("product_name", productName)
    .maybeSingle();
  return data?.product_type === "service";
};

// Sync version using a preloaded map
const isServiceProductSync = (productName: string, serviceMap: Record<string, boolean>): boolean => {
  return serviceMap[productName] ?? false;
};

interface ProductToDispatch {
  product_name: string;
  category: string | null;
  total_qty: number;
  already_dispatched: number;
  remaining_qty: number;
  scanned_qty: number;
  scanned_serials: string[];
  isServiceProduct: boolean;
  serviceAlreadyActivated: boolean;
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

  // Initialize products with already-dispatched counts
  useEffect(() => {
    const initProducts = async () => {
      if (!order || orderItems.length === 0 || !open) return;

      // Preload product types from DB
      const productNames = orderItems.map(item => item.product_name);
      const { data: productTypeData } = await supabase
        .from("products")
        .select("product_name, product_type")
        .in("product_name", productNames);
      
      const serviceMap: Record<string, boolean> = {};
      (productTypeData || []).forEach(p => {
        serviceMap[p.product_name] = p.product_type === "service";
      });

      // Fetch already dispatched inventory for this order
      const { data: dispatchedItems } = await supabase
        .from("inventory")
        .select("product_name")
        .eq("order_id", order.order_id)
        .eq("status", "Dispatched");

      // Count dispatched per product
      const dispatchedCounts: Record<string, number> = {};
      (dispatchedItems || []).forEach(item => {
        dispatchedCounts[item.product_name] = (dispatchedCounts[item.product_name] || 0) + 1;
      });

      // Check if order already has any shipment (for service product activation)
      const { data: existingShipments } = await supabase
        .from("shipments")
        .select("id")
        .eq("order_id", order.order_id);
      
      const hasExistingShipment = (existingShipments || []).length > 0;

      const products = orderItems.map(item => {
        const isService = isServiceProductSync(item.product_name, serviceMap);
        const alreadyDispatched = isService 
          ? (hasExistingShipment ? item.quantity : 0)
          : (dispatchedCounts[item.product_name] || 0);
        const remaining = Math.max(0, item.quantity - alreadyDispatched);
        
        return {
          product_name: item.product_name,
          category: null as string | null,
          total_qty: item.quantity,
          already_dispatched: alreadyDispatched,
          remaining_qty: remaining,
          scanned_qty: 0,
          scanned_serials: [] as string[],
          isServiceProduct: isService,
          serviceAlreadyActivated: isService && hasExistingShipment,
        };
      });
      setProductsToDispatch(products);
    };
    
    initProducts();
  }, [orderItems, order, open]);

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

  // Products that still need dispatching (remaining > 0)
  const physicalProducts = productsToDispatch.filter(p => !p.isServiceProduct && p.remaining_qty > 0);
  const serviceProducts = productsToDispatch.filter(p => p.isServiceProduct && !p.serviceAlreadyActivated && p.remaining_qty > 0);
  const completedProducts = productsToDispatch.filter(p => p.remaining_qty === 0);
  
  // Has anything to dispatch in this batch
  const hasPhysicalScanned = scannedDevices.length > 0;
  const hasNewServices = serviceProducts.length > 0;
  const canDispatch = hasPhysicalScanned || hasNewServices;
  
  // Check if ALL remaining items are scanned (full completion possible)
  const allRemainingScanned = physicalProducts.every(p => p.scanned_qty >= p.remaining_qty);
  const isFullDispatch = allRemainingScanned && serviceProducts.every(p => true);
  
  const hasOnlyServiceProducts = physicalProducts.length === 0 && serviceProducts.length > 0 && completedProducts.every(p => p.isServiceProduct || p.remaining_qty === 0);

  // Summary counts
  const totalOrderItems = productsToDispatch.reduce((sum, p) => sum + p.total_qty, 0);
  const totalAlreadyDispatched = productsToDispatch.reduce((sum, p) => sum + p.already_dispatched, 0);
  const totalRemaining = productsToDispatch.reduce((sum, p) => sum + p.remaining_qty, 0);
  const totalThisDispatch = scannedDevices.length + serviceProducts.reduce((sum, p) => sum + p.remaining_qty, 0);
  const totalAfterDispatch = totalAlreadyDispatched + totalThisDispatch;
  const remainingAfterDispatch = totalOrderItems - totalAfterDispatch;

  // Handle barcode scan/add
  const handleAddDevice = useCallback(async () => {
    const serial = serialInput.trim();
    if (!serial) {
      toast.error("Please enter a serial number");
      return;
    }

    // Check if already scanned in this session
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

    // Check if product matches any required product with remaining qty
    const productIndex = productsToDispatch.findIndex(
      p => p.product_name === inventoryItem.product_name && !p.isServiceProduct && p.scanned_qty < p.remaining_qty
    );

    if (productIndex === -1) {
      const fullProduct = productsToDispatch.find(
        p => p.product_name === inventoryItem.product_name
      );
      if (fullProduct) {
        if (fullProduct.remaining_qty === 0) {
          toast.error(`All ${inventoryItem.product_name} units already dispatched`);
        } else {
          toast.error(`All remaining ${inventoryItem.product_name} units already scanned`);
        }
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

    const remainingNeeded = product.remaining_qty - product.scanned_qty;
    if (remainingNeeded <= 0) return;

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

    const newItems = availableItems.filter(
      item => !scannedDevices.some(d => d.serial_number === item.serial_number)
    );

    if (newItems.length === 0) {
      toast.error("All available items already scanned");
      return;
    }

    setScannedDevices(prev => [...prev, ...newItems.map(item => ({
      serial_number: item.serial_number,
      product_name: item.product_name,
      category: item.category,
    }))]);

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

      // Create shipment record
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

      // Check for renewal products (service products not yet activated)
      const renewalProducts = serviceProducts.filter(p => !p.serviceAlreadyActivated);

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

      // Determine if this is partial or complete
      const isComplete = remainingAfterDispatch === 0;
      const notifTitle = isComplete ? "Dispatch Completed" : "Partial Dispatch";
      const notifMessage = isComplete 
        ? `Order ${order.order_id} for ${order.customer_name || "customer"} has been fully dispatched.`
        : `Order ${order.order_id}: ${totalThisDispatch} item(s) dispatched, ${remainingAfterDispatch} remaining.`;

      createNotification(
        notifTitle,
        notifMessage,
        "dispatch",
        {
          order_id: order.order_id,
          customer_name: order.customer_name,
          devices_count: serialNumbers.length,
          is_partial: !isComplete,
          remaining: remainingAfterDispatch,
        },
        "/dispatch",
        order.order_id
      );

      // Success message
      if (hasOnlyServiceProducts) {
        toast.success(`Service activated for order ${order.order_id}!`);
      } else if (isComplete) {
        toast.success(`Dispatch completed! All items dispatched for order ${order.order_id}.`);
      } else {
        toast.success(`Partial dispatch done! ${totalThisDispatch} item(s) dispatched, ${remainingAfterDispatch} remaining.`);
      }

      // Send dispatch email (non-blocking)
      const productNames = productsToDispatch
        .filter(p => p.scanned_qty > 0 || (p.isServiceProduct && !p.serviceAlreadyActivated))
        .map(p => p.product_name)
        .join(", ");
      
      sendDispatchEmail(order.order_id, {
        dispatchDate: format(new Date(dispatchDate), "dd/MM/yyyy"),
        serialNumbers,
        productName: productNames,
        totalQuantity: totalThisDispatch,
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
              {totalAlreadyDispatched > 0 && (
                <Badge className="bg-info/10 text-info border-info/20 ml-2">
                  Partial — {totalAlreadyDispatched}/{totalOrderItems} already dispatched
                </Badge>
              )}
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

              {/* Live Dispatch Summary */}
              <div className="grid grid-cols-4 gap-3">
                <div className="text-center p-3 rounded-lg border bg-card">
                  <p className="text-2xl font-bold text-foreground">{totalOrderItems}</p>
                  <p className="text-xs text-muted-foreground">Total Items</p>
                </div>
                <div className="text-center p-3 rounded-lg border bg-success/5 border-success/20">
                  <p className="text-2xl font-bold text-success">{totalAlreadyDispatched}</p>
                  <p className="text-xs text-muted-foreground">Already Dispatched</p>
                </div>
                <div className="text-center p-3 rounded-lg border bg-primary/5 border-primary/20">
                  <p className="text-2xl font-bold text-primary">{totalThisDispatch}</p>
                  <p className="text-xs text-muted-foreground">This Dispatch</p>
                </div>
                <div className="text-center p-3 rounded-lg border bg-warning/5 border-warning/20">
                  <p className="text-2xl font-bold text-warning">{remainingAfterDispatch}</p>
                  <p className="text-xs text-muted-foreground">Remaining After</p>
                </div>
              </div>

              {/* Already Completed Products */}
              {completedProducts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-semibold flex items-center gap-2 text-success text-sm">
                    <CheckCircle2 className="h-4 w-4" />
                    Already Dispatched
                  </h3>
                  {completedProducts.map((product, index) => (
                    <div key={`done-${index}`} className="p-3 rounded-lg border border-success/20 bg-success/5 opacity-60">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{product.product_name}</span>
                        <Badge className="bg-success/10 text-success text-xs">
                          {product.total_qty}/{product.total_qty} ✓
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Service Products (Digital) - only if not yet activated */}
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
                          <div className="text-right">
                            <p className="text-lg font-bold text-primary">
                              {product.remaining_qty} unit(s)
                            </p>
                            <p className="text-sm text-primary">Will be activated</p>
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
                      const remaining = product.remaining_qty - product.scanned_qty;
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
                              {product.already_dispatched > 0 && (
                                <p className="text-xs text-success mt-1">
                                  {product.already_dispatched} already dispatched in previous batch(es)
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className={`text-lg font-bold ${isComplete ? "text-success" : "text-warning"}`}>
                                  {product.scanned_qty} / {product.remaining_qty}
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

              {/* Barcode Scanner Section */}
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

              {/* Scanned Devices List */}
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
              {!hasOnlyServiceProducts && (
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
              )}
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
              className={`flex-1 gap-2 ${canDispatch ? "bg-success hover:bg-success/90" : "bg-muted text-muted-foreground"}`}
              disabled={!canDispatch || isProcessing}
              onClick={() => setShowConfirmDialog(true)}
            >
              <Send className="h-4 w-4" />
              {hasOnlyServiceProducts 
                ? `Activate Service (${serviceProducts.length} item${serviceProducts.length > 1 ? 's' : ''})`
                : `Create Dispatch (${totalThisDispatch} item${totalThisDispatch !== 1 ? 's' : ''})`
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
              {hasOnlyServiceProducts ? "Confirm Service Activation" : (isFullDispatch ? "Confirm Full Dispatch" : "Confirm Partial Dispatch")}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {hasOnlyServiceProducts ? (
                <>
                  <p>You are about to activate <strong>{serviceProducts.length}</strong> service(s) for order <strong>{order?.order_id}</strong>.</p>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    <li>Activate digital service products</li>
                    <li>Start <strong>364-day</strong> renewal countdown</li>
                  </ul>
                </>
              ) : (
                <>
                  <p>
                    {isFullDispatch 
                      ? <>You are about to dispatch <strong>all remaining items</strong> for order <strong>{order?.order_id}</strong>.</>
                      : <>You are about to make a <strong>partial dispatch</strong> for order <strong>{order?.order_id}</strong>.</>
                    }
                  </p>
                  <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1 mt-2">
                    <p><strong>This dispatch:</strong> {totalThisDispatch} item(s)</p>
                    <p><strong>Already dispatched:</strong> {totalAlreadyDispatched} item(s)</p>
                    <p><strong>Remaining after:</strong> {remainingAfterDispatch} item(s)</p>
                  </div>
                  <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                    {scannedDevices.length > 0 && (
                      <li>Mark <strong>{scannedDevices.length}</strong> device(s) as Dispatched</li>
                    )}
                    <li>Create a shipment record</li>
                    {serviceProducts.length > 0 && (
                      <li>Activate <strong>{serviceProducts.length}</strong> digital service(s)</li>
                    )}
                  </ul>
                  {!isFullDispatch && (
                    <p className="mt-2 text-info font-medium">
                      ℹ️ You can dispatch the remaining {remainingAfterDispatch} item(s) later.
                    </p>
                  )}
                </>
              )}
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
