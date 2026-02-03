import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Truck, 
  Info, 
  Package, 
  CheckCircle2,
  MapPin,
  Calendar,
  Box
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import type { Sale } from "@/hooks/useSales";

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

  // Fetch dispatched devices for this order
  useEffect(() => {
    const fetchDispatchedDevices = async () => {
      if (!order || !open) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("inventory")
          .select("serial_number, product_name, category, dispatch_date")
          .eq("order_id", order.order_id)
          .eq("status", "Dispatched");

        if (error) throw error;
        setDispatchedDevices(data || []);
      } catch (error) {
        console.error("Error fetching dispatched devices:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDispatchedDevices();
  }, [order, open]);

  if (!order) return null;

  // Get shipments for this order
  const orderShipments = shipments.filter(
    s => s.order_id === order.order_id || s.order_id === order.order_id.replace("ORD", "")
  );

  // Group devices by product
  const devicesByProduct = dispatchedDevices.reduce((acc, device) => {
    if (!acc[device.product_name]) {
      acc[device.product_name] = [];
    }
    acc[device.product_name].push(device);
    return acc;
  }, {} as Record<string, DispatchedDevice[]>);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl h-[85vh] max-h-[85vh] p-0 overflow-hidden flex flex-col">
        <DialogHeader className="px-6 pt-6 pb-4 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Truck className="h-6 w-6 text-success" />
            Dispatch Details
            <Badge className="bg-success/10 text-success border-success/20 ml-2">Completed</Badge>
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

            {/* Shipment Information */}
            {orderShipments.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Shipment Information
                </h3>
                <div className="grid gap-3">
                  {orderShipments.map((shipment) => (
                    <div
                      key={shipment.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Courier Partner</p>
                          <p className="font-medium">{shipment.courier_partner || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Mode</p>
                          <p className="font-medium">{shipment.shipping_mode || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Tracking ID</p>
                          <p className="font-medium text-primary">{shipment.tracking_id || "-"}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Shipping Cost</p>
                          <p className="font-medium">₹{shipment.shipping_cost?.toLocaleString() || "0"}</p>
                        </div>
                      </div>
                      {shipment.created_at && (
                        <div className="mt-3 pt-3 border-t flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          Dispatched on {format(new Date(shipment.created_at), "dd MMM yyyy, hh:mm a")}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Dispatched Products */}
            <div className="space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <Package className="h-5 w-5 text-success" />
                Dispatched Products
                <Badge className="bg-success text-white ml-2">{dispatchedDevices.length} Devices</Badge>
              </h3>

              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading...</div>
              ) : dispatchedDevices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  No dispatched devices found for this order
                </div>
              ) : (
                <div className="space-y-4">
                  {Object.entries(devicesByProduct).map(([productName, devices]) => (
                    <div key={productName} className="border rounded-lg overflow-hidden">
                      <div className="bg-muted/50 px-4 py-3 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Box className="h-4 w-4 text-primary" />
                          <span className="font-medium">{productName}</span>
                        </div>
                        <Badge variant="secondary">{devices.length} units</Badge>
                      </div>
                      <div className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {devices.map((device) => (
                            <div
                              key={device.serial_number}
                              className="flex items-center gap-2 px-3 py-2 bg-success/10 rounded-lg border border-success/20"
                            >
                              <CheckCircle2 className="h-4 w-4 text-success" />
                              <span className="font-mono text-sm">{device.serial_number}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
