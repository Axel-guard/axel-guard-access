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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Edit, CheckCircle, Save, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { InventoryItem } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";

interface QCUpdateDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const QC_OPTIONS = [
  { value: "QC Pass", label: "QC Pass" },
  { value: "QC Fail", label: "QC Fail" },
  { value: "Pending", label: "Pending" },
];

const TEST_OPTIONS = [
  { value: "OK", label: "OK" },
  { value: "Fail", label: "Fail" },
  { value: "", label: "-- Select --" },
];

// Calculate final QC status based on individual test results
const calculateFinalStatus = (formData: Record<string, string>): string => {
  const testFields = [
    "sd_connect",
    "all_channels",
    "network_test",
    "gps_test",
    "sim_slot",
    "online_test",
    "camera_quality",
    "monitor_test",
  ];
  
  const testValues = testFields.map((field) => formData[field]?.toLowerCase() || "");
  
  // If any test is "fail", final is FAIL
  if (testValues.some((v) => v === "fail")) {
    return "QC Fail";
  }
  
  // If all tests are "ok" or "pass", final is PASS
  const completedTests = testValues.filter((v) => v === "ok" || v === "pass");
  if (completedTests.length === testFields.length) {
    return "QC Pass";
  }
  
  // Otherwise, it's pending
  return "Pending";
};

export const QCUpdateDialog = ({ item, open, onOpenChange }: QCUpdateDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products } = useProducts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    qc_date: "",
    serial_number: "",
    product_name: "",
    category: "",
    sd_connect: "",
    all_channels: "",
    network_test: "",
    gps_test: "",
    sim_slot: "",
    online_test: "",
    camera_quality: "",
    monitor_test: "",
    qc_result: "",
    ip_address: "",
    checked_by: "",
  });

  // Load item data when dialog opens
  useEffect(() => {
    if (item && open) {
      setFormData({
        qc_date: item.qc_date ? new Date(item.qc_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
        serial_number: item.serial_number || "",
        product_name: item.product_name || "",
        category: item.category || "",
        sd_connect: item.sd_connect || "",
        all_channels: item.all_channels || "",
        network_test: item.network_test || "",
        gps_test: item.gps_test || "",
        sim_slot: item.sim_slot || "",
        online_test: item.online_test || "",
        camera_quality: item.camera_quality || "",
        monitor_test: item.monitor_test || "",
        qc_result: item.qc_result || "Pending",
        ip_address: item.ip_address || "",
        checked_by: item.checked_by || "",
      });
    }
  }, [item, open]);

  // Auto-calculate final status when tests change
  useEffect(() => {
    const calculatedStatus = calculateFinalStatus(formData);
    if (calculatedStatus !== formData.qc_result) {
      setFormData((prev) => ({ ...prev, qc_result: calculatedStatus }));
    }
  }, [
    formData.sd_connect,
    formData.all_channels,
    formData.network_test,
    formData.gps_test,
    formData.sim_slot,
    formData.online_test,
    formData.camera_quality,
    formData.monitor_test,
  ]);

  // Get unique categories from products
  const categories = products
    ? [...new Set(products.map((p) => p.category))].sort()
    : [];

  // Get products for selected category
  const categoryProducts = products
    ? products.filter((p) => p.category === formData.category)
    : [];

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      category,
      product_name: "", // Reset product when category changes
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!item?.id) {
      toast({
        title: "Error",
        description: "No item selected for update",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("inventory")
        .update({
          qc_date: formData.qc_date || null,
          product_name: formData.product_name,
          category: formData.category,
          sd_connect: formData.sd_connect || null,
          all_channels: formData.all_channels || null,
          network_test: formData.network_test || null,
          gps_test: formData.gps_test || null,
          sim_slot: formData.sim_slot || null,
          online_test: formData.online_test || null,
          camera_quality: formData.camera_quality || null,
          monitor_test: formData.monitor_test || null,
          qc_result: formData.qc_result,
          ip_address: formData.ip_address || null,
          checked_by: formData.checked_by || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", item.id);

      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["inventory"] });

      toast({
        title: "QC Updated",
        description: `QC report for ${formData.serial_number} saved successfully.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update QC record",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Update QC - Manual Entry
          </DialogTitle>
        </DialogHeader>

        {item && (
          <div className="bg-success/10 border border-success/20 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-2 text-success mb-2">
              <CheckCircle className="h-5 w-5" />
              <span className="font-medium">Device Loaded Successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Serial Number:</span>
                <p className="font-semibold">{item.serial_number}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Model Name:</span>
                <p className="font-semibold">{item.product_name || "N/A"}</p>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="qc_date">QC Date *</Label>
              <Input
                id="qc_date"
                type="date"
                value={formData.qc_date}
                onChange={(e) => setFormData({ ...formData, qc_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="serial_number">Serial Number *</Label>
              <Input
                id="serial_number"
                value={formData.serial_number}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={handleCategoryChange}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Category --" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="product_name">Product Name *</Label>
              <Select
                value={formData.product_name}
                onValueChange={(value) => setFormData({ ...formData, product_name: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select Product --" />
                </SelectTrigger>
                <SelectContent>
                  {categoryProducts.map((p) => (
                    <SelectItem key={p.id} value={p.product_name}>
                      {p.product_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Test Results */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Camera Quality (For Camera)</Label>
              <Select
                value={formData.camera_quality}
                onValueChange={(value) => setFormData({ ...formData, camera_quality: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SD Connectivity QC</Label>
              <Select
                value={formData.sd_connect}
                onValueChange={(value) => setFormData({ ...formData, sd_connect: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>All Ch QC Status</Label>
              <Select
                value={formData.all_channels}
                onValueChange={(value) => setFormData({ ...formData, all_channels: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Network Connectivity QC</Label>
              <Select
                value={formData.network_test}
                onValueChange={(value) => setFormData({ ...formData, network_test: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>GPS QC</Label>
              <Select
                value={formData.gps_test}
                onValueChange={(value) => setFormData({ ...formData, gps_test: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>SIM Card Slot QC</Label>
              <Select
                value={formData.sim_slot}
                onValueChange={(value) => setFormData({ ...formData, sim_slot: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Online QC</Label>
              <Select
                value={formData.online_test}
                onValueChange={(value) => setFormData({ ...formData, online_test: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Monitor QC Status</Label>
              <Select
                value={formData.monitor_test}
                onValueChange={(value) => setFormData({ ...formData, monitor_test: value === "none" ? "" : value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {TEST_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value || "none"}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Final QC Status *</Label>
              <Select
                value={formData.qc_result}
                onValueChange={(value) => setFormData({ ...formData, qc_result: value })}
              >
                <SelectTrigger className="border-primary">
                  <SelectValue placeholder="-- Select --" />
                </SelectTrigger>
                <SelectContent>
                  {QC_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ip_address">IP Address</Label>
              <Input
                id="ip_address"
                value={formData.ip_address}
                onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                placeholder="e.g., 192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="checked_by">Checked By</Label>
              <Input
                id="checked_by"
                value={formData.checked_by}
                onChange={(e) => setFormData({ ...formData, checked_by: e.target.value })}
                placeholder="Inspector name"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save QC Report
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
