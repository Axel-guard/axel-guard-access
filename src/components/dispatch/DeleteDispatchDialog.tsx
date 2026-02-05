import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertTriangle } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
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

interface DeleteDispatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: Sale | null;
  shipments: Shipment[];
  onSuccess?: () => void;
}

export const DeleteDispatchDialog = ({
  open,
  onOpenChange,
  order,
  shipments,
  onSuccess,
}: DeleteDispatchDialogProps) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const queryClient = useQueryClient();

  if (!order) return null;

  // Get shipments for this order
  const orderShipments = shipments.filter(
    s => s.order_id === order.order_id || s.order_id === order.order_id.replace("ORD", "")
  );

  const handleDelete = async () => {
    if (!order) return;

    setIsDeleting(true);
    try {
      // Step 1: Find all dispatched inventory items for this order
      const { data: dispatchedItems, error: fetchError } = await supabase
        .from("inventory")
        .select("id, serial_number, product_name")
        .eq("order_id", order.order_id)
        .eq("status", "Dispatched");

      if (fetchError) throw fetchError;

      // Step 2: Return items to inventory (mark as In Stock, clear dispatch info)
      if (dispatchedItems && dispatchedItems.length > 0) {
        const { error: updateError } = await supabase
          .from("inventory")
          .update({
            status: "In Stock",
            order_id: null,
            customer_name: null,
            customer_code: null,
            customer_city: null,
            dispatch_date: null,
          })
          .eq("order_id", order.order_id)
          .eq("status", "Dispatched");

        if (updateError) throw updateError;

        console.log(`Returned ${dispatchedItems.length} items to inventory`);
      }

      // Step 3: Delete all shipment records for this order
      if (orderShipments.length > 0) {
        const shipmentIds = orderShipments.map(s => s.id);
        const { error: deleteShipmentsError } = await supabase
          .from("shipments")
          .delete()
          .in("id", shipmentIds);

        if (deleteShipmentsError) throw deleteShipmentsError;

        console.log(`Deleted ${orderShipments.length} shipment records`);
      }

      // Step 4: Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ["shipments"] });
      await queryClient.invalidateQueries({ queryKey: ["shipments-summary"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["sales"] });

      toast.success("Dispatch deleted. Stock restored to inventory.", {
        description: `${dispatchedItems?.length || 0} device(s) returned to stock`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error deleting dispatch:", error);
      toast.error("Failed to delete dispatch", {
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Delete Dispatch
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete this dispatch for order{" "}
              <span className="font-semibold text-foreground">{order.order_id.replace("ORD", "")}</span>?
            </p>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium text-foreground mb-2">This action will:</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>Return all dispatched items to inventory</li>
                <li>Mark serial numbers as available again</li>
                <li>Delete all shipment/tracking records</li>
                <li>Update order status to Pending</li>
              </ul>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deleting...
              </>
            ) : (
              "Confirm Delete"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
