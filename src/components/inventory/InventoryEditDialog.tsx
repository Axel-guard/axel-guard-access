import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { InventoryItem } from "@/hooks/useInventory";

interface InventoryEditDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InventoryEditDialog = ({
  item,
  open,
  onOpenChange,
}: InventoryEditDialogProps) => {
  const [formData, setFormData] = useState<Partial<InventoryItem>>({});
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (item) {
      setFormData({
        serial_number: item.serial_number,
        product_name: item.product_name,
        status: item.status,
        qc_result: item.qc_result,
        in_date: item.in_date?.split("T")[0] || "",
        dispatch_date: item.dispatch_date?.split("T")[0] || "",
        customer_code: item.customer_code || "",
        customer_name: item.customer_name || "",
        customer_city: item.customer_city || "",
        order_id: item.order_id || "",
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("inventory")
        .update({
          ...formData,
          in_date: formData.in_date || null,
          dispatch_date: formData.dispatch_date || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["inventory"] });
      await queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });

      toast({
        title: "Updated",
        description: "Inventory item updated successfully",
      });

      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update item",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Inventory Item</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number</Label>
              <Input
                id="serial_number"
                value={formData.serial_number || ""}
                onChange={(e) => handleChange("serial_number", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name</Label>
              <Input
                id="product_name"
                value={formData.product_name || ""}
                onChange={(e) => handleChange("product_name", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status || ""}
                onValueChange={(value) => handleChange("status", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In Stock">In Stock</SelectItem>
                  <SelectItem value="Dispatched">Dispatched</SelectItem>
                  <SelectItem value="QC Pending">QC Pending</SelectItem>
                  <SelectItem value="Defective">Defective</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="qc_result">QC Result</Label>
              <Select
                value={formData.qc_result || ""}
                onValueChange={(value) => handleChange("qc_result", value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select QC result" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pass">Pass</SelectItem>
                  <SelectItem value="Fail">Fail</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="in_date">In Date</Label>
              <Input
                id="in_date"
                type="date"
                value={formData.in_date || ""}
                onChange={(e) => handleChange("in_date", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dispatch_date">Dispatch Date</Label>
              <Input
                id="dispatch_date"
                type="date"
                value={formData.dispatch_date || ""}
                onChange={(e) => handleChange("dispatch_date", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_code">Customer Code</Label>
              <Input
                id="customer_code"
                value={formData.customer_code || ""}
                onChange={(e) => handleChange("customer_code", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_name">Customer Name</Label>
              <Input
                id="customer_name"
                value={formData.customer_name || ""}
                onChange={(e) => handleChange("customer_name", e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer_city">Customer City</Label>
              <Input
                id="customer_city"
                value={formData.customer_city || ""}
                onChange={(e) => handleChange("customer_city", e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="order_id">Order ID</Label>
              <Input
                id="order_id"
                value={formData.order_id || ""}
                onChange={(e) => handleChange("order_id", e.target.value)}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
