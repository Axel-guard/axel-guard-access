import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Truck, 
  Info, 
  Package, 
  CheckCircle2,
  MapPin,
  Calendar,
  Box,
  Mail,
  Loader2,
  Clock
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Sale } from "@/hooks/useSales";
import { useEmail } from "@/hooks/useEmail";

interface Shipment {
  id: string;
  order_id: string | null;
  shipment_type: string;
  courier_partner: string | null;
  shipping_mode: string | null;
  tracking_id: string | null;
  weight_kg: number | null;
  shipping_cost: number | null;
  created_at: string | null;
}

interface DispatchedDevice {
  serial_number: string;
  product_name: string;
  category: string | null;
  dispatch_date: string | null;
}

interface ViewDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Sale | null;
  shipments: Shipment[];
}

export const ViewDispatchDialog = ({
  open,
  onOpenChange,
  order,
  shipments,
}: ViewDispatchDialogProps) => {
  const [dispatchedDevices, setDispatchedDevices] = useState<DispatchedDevice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalItems, setTotalItems] = useState(0);
  const { sendEmail, isLoading: isSendingEmail } = useEmail();

  // Fetch dispatched devices and total items for this order
  useEffect(() => {
    const fetchData = async () => {
      if (!order || !open) return;
      
      setIsLoading(true);
      try {
        const [devicesRes, itemsRes] = await Promise.all([
          supabase
            .from("inventory")
            .select("serial_number, product_name, category, dispatch_date")
            .eq("order_id", order.order_id)
            .eq("status", "Dispatched"),
          supabase
            .from("sale_items")
            .select("quantity")
            .eq("order_id", order.order_id),
        ]);

        setDispatchedDevices(devicesRes.data || []);
        setTotalItems(
          (itemsRes.data || []).reduce((sum, item) => sum + Number(item.quantity), 0)
        );
      } catch (error) {
        console.error("Error fetching dispatch data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [order, open]);

  if (!order) return null;

  const handleSendEmail = async () => {
    if (order) {
      await sendEmail("dispatch", order.order_id);
    }
  };

  // Get shipments for this order, sorted by date
  const orderShipments = shipments
    .filter(s => s.order_id === order.order_id || s.order_id === order.order_id.replace("ORD", ""))
    .sort((a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime());

  const dispatched = dispatchedDevices.length;
  const remaining = Math.max(0, totalItems - dispatched);
  const isComplete = remaining === 0 && totalItems > 0;

  // Group devices by dispatch_date for history view
  const dispatchHistory = dispatchedDevices.reduce((acc, device) => {
    const dateKey = device.dispatch_date 
      ? format(new Date(device.dispatch_date), "yyyy-MM-dd")
      : "Unknown";
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(device);
    return acc;
  }, {} as Record<string, DispatchedDevice[]>);

  // Group devices within each date by product
  const getDevicesByProduct = (devices: DispatchedDevice[]) => {
    return devices.reduce((acc, device) => {
      if (!acc[device.product_name]) acc[device.product_name] = [];
      acc[device.product_name].push(device);
      return acc;
    }, {} as Record<string, DispatchedDevice[]>);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Truck className="h-6 w-6 text-success" />
            Dispatch Details
            {isComplete ? (
              <Badge className="bg-success/10 text-success border-success/20 ml-2">Completed</Badge>
            ) : (
              <Badge className="bg-info/10 text-info border-info/20 ml-2">
                Partially Dispatched ({dispatched}/{totalItems})
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={handleSendEmail}
              disabled={isSendingEmail}
              className="gap-2 ml-auto"
            >
              {isSendingEmail ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Mail className="h-4 w-4" />
              )}
              Send Mail
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-6">
            {/* Order Details Header */}
            <div className="bg-gradient-to-r from-success to-success/80 rounded-xl p-5 text-white">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5" />
                <span className="font-semibold">Order Details</span>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-white/70">Order ID</p>
                  <p className="font-bold text-lg">{order.order_id.replace("ORD", "")}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Customer</p>
                  <p className="font-semibold">{order.customer_name || "-"}</p>
                  <p className="text-sm text-white/70">{order.company_name || ""}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Order Date</p>
                  <p className="font-semibold">
                    {order.sale_date ? format(new Date(order.sale_date), "dd MMM yyyy") : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Dispatch Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-lg border bg-card">
                <p className="text-2xl font-bold text-foreground">{totalItems}</p>
                <p className="text-xs text-muted-foreground">Total Items</p>
              </div>
              <div className="text-center p-3 rounded-lg border bg-success/5 border-success/20">
                <p className="text-2xl font-bold text-success">{dispatched}</p>
                <p className="text-xs text-muted-foreground">Dispatched</p>
              </div>
              <div className="text-center p-3 rounded-lg border bg-warning/5 border-warning/20">
                <p className="text-2xl font-bold text-warning">{remaining}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>

            {/* Dispatch History */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Dispatch History
                <Badge variant="secondary">{orderShipments.length} Shipment(s)</Badge>
              </h3>
              
              {orderShipments.map((shipment, idx) => {
                const shipmentDate = shipment.created_at 
                  ? format(new Date(shipment.created_at), "yyyy-MM-dd")
                  : null;
                // Find devices dispatched around this shipment date
                const matchingDateKey = Object.keys(dispatchHistory).find(dk => dk === shipmentDate) || Object.keys(dispatchHistory)[idx];
                const shipmentDevices = matchingDateKey ? (dispatchHistory[matchingDateKey] || []) : [];
                const devicesByProduct = getDevicesByProduct(shipmentDevices);

                return (
                  <div key={shipment.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="font-semibold">Dispatch #{idx + 1}</span>
                        {shipment.created_at && (
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(shipment.created_at), "dd MMM yyyy, hh:mm a")}
                          </span>
                        )}
                      </div>
                      <Badge variant="secondary">{shipmentDevices.length} device(s)</Badge>
                    </div>
                    
                    {/* Shipment courier info */}
                    <div className="px-4 py-3 grid grid-cols-2 md:grid-cols-4 gap-3 border-b text-sm">
                      <div>
                        <p className="text-muted-foreground">Courier</p>
                        <p className="font-medium">{shipment.courier_partner || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Mode</p>
                        <p className="font-medium">{shipment.shipping_mode || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Tracking ID</p>
                        <p className="font-medium text-primary">{shipment.tracking_id || "-"}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Cost</p>
                        <p className="font-medium">₹{shipment.shipping_cost?.toLocaleString() || "0"}</p>
                      </div>
                    </div>

                    {/* Devices in this dispatch */}
                    {shipmentDevices.length > 0 && (
                      <div className="p-4 space-y-3">
                        {Object.entries(devicesByProduct).map(([productName, devices]) => (
                          <div key={productName}>
                            <div className="flex items-center gap-2 mb-2">
                              <Box className="h-4 w-4 text-primary" />
                              <span className="font-medium text-sm">{productName}</span>
                              <Badge variant="secondary" className="text-xs">{devices.length} units</Badge>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {devices.map((device) => (
                                <div
                                  key={device.serial_number}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-success/10 rounded-lg border border-success/20 text-xs"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-success" />
                                  <span className="font-mono">{device.serial_number}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Order Summary */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <h3 className="font-semibold mb-3">Order Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Total Amount</p>
                  <p className="font-semibold text-lg">₹{order.total_amount?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Amount Received</p>
                  <p className="font-semibold text-lg text-success">₹{order.amount_received?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Balance</p>
                  <p className={`font-semibold text-lg ${Number(order.balance_amount) > 0 ? "text-warning" : "text-success"}`}>
                    ₹{order.balance_amount?.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Courier Cost</p>
                  <p className="font-semibold text-lg">₹{order.courier_cost?.toLocaleString() || "0"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
