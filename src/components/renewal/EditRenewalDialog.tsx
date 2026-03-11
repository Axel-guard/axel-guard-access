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
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Renewal } from "@/hooks/useRenewals";

interface EditRenewalDialogProps {
  renewal: Renewal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditRenewalDialog = ({ renewal, open, onOpenChange }: EditRenewalDialogProps) => {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    order_id: "",
    customer_name: "",
    company_name: "",
    product_name: "",
    product_type: "",
    dispatch_date: "",
    renewal_start_date: "",
    renewal_end_date: "",
  });

  useEffect(() => {
    if (renewal) {
      setForm({
        order_id: renewal.order_id || "",
        customer_name: renewal.customer_name || "",
        company_name: renewal.company_name || "",
        product_name: renewal.product_name || "",
        product_type: renewal.product_type || "",
        dispatch_date: renewal.dispatch_date?.split("T")[0] || "",
        renewal_start_date: renewal.renewal_start_date?.split("T")[0] || "",
        renewal_end_date: renewal.renewal_end_date?.split("T")[0] || "",
      });
    }
  }, [renewal]);

  const handleSave = async () => {
    if (!renewal) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("renewals")
        .update({
          order_id: form.order_id,
          customer_name: form.customer_name,
          company_name: form.company_name,
          product_name: form.product_name,
          product_type: form.product_type,
          dispatch_date: form.dispatch_date,
          renewal_start_date: form.renewal_start_date,
          renewal_end_date: form.renewal_end_date,
        })
        .eq("id", renewal.id);

      if (error) throw error;
      toast.success("Renewal updated successfully");
      queryClient.invalidateQueries({ queryKey: ["renewals"] });
      queryClient.invalidateQueries({ queryKey: ["renewals-summary"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(`Failed to update: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!renewal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Renewal</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Order ID</Label>
            <Input value={form.order_id} onChange={(e) => setForm({ ...form, order_id: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Customer Name</Label>
            <Input value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Company Name</Label>
            <Input value={form.company_name} onChange={(e) => setForm({ ...form, company_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Product Name</Label>
            <Input value={form.product_name} onChange={(e) => setForm({ ...form, product_name: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Product Type</Label>
            <Input value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Dispatch Date</Label>
            <Input type="date" value={form.dispatch_date} onChange={(e) => setForm({ ...form, dispatch_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>Start Date</Label>
            <Input type="date" value={form.renewal_start_date} onChange={(e) => setForm({ ...form, renewal_start_date: e.target.value })} />
          </div>
          <div className="space-y-1.5">
            <Label>End Date</Label>
            <Input type="date" value={form.renewal_end_date} onChange={(e) => setForm({ ...form, renewal_end_date: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
