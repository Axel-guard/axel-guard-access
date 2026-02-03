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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Truck, Plus, Save, Loader2, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TrackingDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  editData?: {
    id: string;
    shipment_type: string;
    order_id: string | null;
    courier_partner: string | null;
    shipping_mode: string | null;
    tracking_id: string | null;
    weight_kg: number | null;
    shipping_cost: number | null;
  } | null;
}

const SHIPMENT_TYPES = ["Sale", "Replacement"];
const COURIER_PARTNERS = [
  "Delhivery",
  "DTDC",
  "Ecom Express",
  "BlueDart",
  "XpressBees",
  "Shadowfax",
  "Ekart",
  "Professional Courier",
  "India Post",
  "Other"
];
const COURIER_MODES = ["Surface", "Air", "Priority", "Bus"];

export const TrackingDetailsDialog = ({ 
  open, 
  onOpenChange, 
  onSuccess,
  editData 
}: TrackingDetailsDialogProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderLookupStatus, setOrderLookupStatus] = useState<"idle" | "loading" | "found" | "not_found">("idle");
  const [orderDetails, setOrderDetails] = useState<{
    customer_name?: string;
    customer_code?: string;
    total_amount?: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    shipment_type: "",
    order_id: "",
    courier_partner: "",
    shipping_mode: "",
    tracking_id: "",
    weight_kg: "",
    shipping_cost: "",
  });

  // Reset form when dialog opens/closes or editData changes
  useEffect(() => {
    if (open) {
      if (editData) {
        setFormData({
          shipment_type: editData.shipment_type || "",
          order_id: editData.order_id || "",
          courier_partner: editData.courier_partner || "",
          shipping_mode: editData.shipping_mode || "",
          tracking_id: editData.tracking_id || "",
          weight_kg: editData.weight_kg?.toString() || "",
          shipping_cost: editData.shipping_cost?.toString() || "",
        });
        if (editData.order_id) {
          lookupOrder(editData.order_id);
        }
      } else {
        setFormData({
          shipment_type: "",
          order_id: "",
          courier_partner: "",
          shipping_mode: "",
          tracking_id: "",
          weight_kg: "",
          shipping_cost: "",
        });
        setOrderLookupStatus("idle");
        setOrderDetails(null);
      }
    }
  }, [open, editData]);

  // Lookup order from sales
  const lookupOrder = useCallback(async (orderId: string) => {
    if (!orderId || orderId.length < 3) {
      setOrderLookupStatus("idle");
      setOrderDetails(null);
      return;
    }

    setOrderLookupStatus("loading");
    
    try {
      const { data, error } = await supabase
        .from("sales")
        .select("customer_name, customer_code, total_amount")
        .eq("order_id", orderId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setOrderDetails(data);
        setOrderLookupStatus("found");
      } else {
        setOrderDetails(null);
        setOrderLookupStatus("not_found");
      }
    } catch (error) {
      console.error("Order lookup error:", error);
      setOrderLookupStatus("not_found");
      setOrderDetails(null);
    }
  }, []);

  // Debounced order lookup
  useEffect(() => {
    const timer = setTimeout(() => {
      if (formData.order_id) {
        lookupOrder(formData.order_id);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.order_id, lookupOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!formData.shipment_type) {
      toast.error("Please select a shipment type");
      return;
    }
    if (!formData.courier_partner) {
      toast.error("Please select a courier partner");
      return;
    }
    if (!formData.shipping_mode) {
      toast.error("Please select a courier mode");
      return;
    }
    if (!formData.tracking_id.trim()) {
      toast.error("Please enter a tracking ID");
      return;
    }

    setIsSubmitting(true);

    try {
      const shipmentData = {
        shipment_type: formData.shipment_type,
        order_id: formData.order_id || null,
        courier_partner: formData.courier_partner,
        shipping_mode: formData.shipping_mode,
        tracking_id: formData.tracking_id.trim(),
        weight_kg: formData.weight_kg ? parseFloat(formData.weight_kg) : null,
        shipping_cost: formData.shipping_cost ? parseFloat(formData.shipping_cost) : null,
      };

      if (editData?.id) {
        // Update existing
        const { error } = await supabase
          .from("shipments")
          .update(shipmentData)
          .eq("id", editData.id);

        if (error) throw error;
        toast.success("Tracking details updated successfully!");
      } else {
        // Create new
        const { error } = await supabase
          .from("shipments")
          .insert(shipmentData);

        if (error) throw error;
        toast.success("Tracking details saved successfully!");
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving tracking details:", error);
      toast.error(`Failed to save: ${error.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-primary" />
            {editData ? "Edit Tracking Details" : "Add Tracking Details"}
          </DialogTitle>
        </DialogHeader>

        {/* Info Banner */}
        <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Plus className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <h3 className="font-semibold text-primary">
                {editData ? "Update Tracking Details" : "Add Tracking Details"}
              </h3>
              <p className="text-sm text-muted-foreground">
                Enter order tracking information to link with sales data
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div className="space-y-2">
            <Label htmlFor="type">Type *</Label>
            <Select
              value={formData.shipment_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, shipment_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select Type --" />
              </SelectTrigger>
              <SelectContent>
                {SHIPMENT_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Order ID */}
          <div className="space-y-2">
            <Label htmlFor="order_id">Order ID</Label>
            <div className="relative">
              <Input
                id="order_id"
                value={formData.order_id}
                onChange={(e) => setFormData(prev => ({ ...prev, order_id: e.target.value }))}
                placeholder="Enter Order ID from Sales (optional)"
              />
              {orderLookupStatus === "loading" && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {orderLookupStatus === "found" && (
                <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
              )}
              {orderLookupStatus === "not_found" && formData.order_id && (
                <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-warning" />
              )}
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Info className="h-3 w-3" />
              Optional - Link to existing Order ID in sales
            </p>
            
            {/* Order Details Display */}
            {orderLookupStatus === "found" && orderDetails && (
              <div className="bg-success/10 border border-success/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-success">Order Found!</p>
                <p className="text-muted-foreground">
                  Customer: {orderDetails.customer_name || orderDetails.customer_code}
                </p>
                <p className="text-muted-foreground">
                  Amount: ₹{orderDetails.total_amount?.toLocaleString()}
                </p>
              </div>
            )}
            {orderLookupStatus === "not_found" && formData.order_id && (
              <div className="bg-warning/10 border border-warning/20 rounded-lg p-3 text-sm">
                <p className="font-medium text-warning flex items-center gap-1">
                  <AlertCircle className="h-4 w-4" />
                  Order not found in sales database
                </p>
              </div>
            )}
          </div>

          {/* Courier Partner */}
          <div className="space-y-2">
            <Label htmlFor="courier_partner">Courier Partner *</Label>
            <Select
              value={formData.courier_partner}
              onValueChange={(value) => setFormData(prev => ({ ...prev, courier_partner: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select Courier Partner --" />
              </SelectTrigger>
              <SelectContent>
                {COURIER_PARTNERS.map(partner => (
                  <SelectItem key={partner} value={partner}>{partner}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Courier Mode */}
          <div className="space-y-2">
            <Label htmlFor="courier_mode">Courier Mode *</Label>
            <Select
              value={formData.shipping_mode}
              onValueChange={(value) => setFormData(prev => ({ ...prev, shipping_mode: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="-- Select Mode --" />
              </SelectTrigger>
              <SelectContent>
                {COURIER_MODES.map(mode => (
                  <SelectItem key={mode} value={mode}>{mode}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tracking ID */}
          <div className="space-y-2">
            <Label htmlFor="tracking_id">Tracking ID *</Label>
            <Input
              id="tracking_id"
              value={formData.tracking_id}
              onChange={(e) => setFormData(prev => ({ ...prev, tracking_id: e.target.value }))}
              placeholder="e.g., TRACK123456789"
            />
          </div>

          {/* Weight and Price - Optional */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight">Weight (Kg)</Label>
              <Input
                id="weight"
                type="number"
                step="0.01"
                min="0"
                value={formData.weight_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price">Shipping Cost (₹)</Label>
              <Input
                id="price"
                type="number"
                step="1"
                min="0"
                value={formData.shipping_cost}
                onChange={(e) => setFormData(prev => ({ ...prev, shipping_cost: e.target.value }))}
                placeholder="0"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full gap-2 bg-primary hover:bg-primary/90"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Tracking Details
              </>
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
