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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Edit, 
  CheckCircle, 
  Save, 
  X, 
  Loader2, 
  Camera, 
  Wifi, 
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { InventoryItem } from "@/hooks/useInventory";
import { useProducts } from "@/hooks/useProducts";
import { cn } from "@/lib/utils";
import { createNotification } from "@/hooks/useNotifications";

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

// Component for test select with status icon
const TestSelect = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: string; 
  onChange: (value: string) => void;
}) => {
  const getStatusIcon = () => {
    if (!value) return null;
    if (value.toLowerCase() === "ok" || value.toLowerCase() === "pass") {
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    }
    if (value.toLowerCase() === "fail") {
      return <XCircle className="h-4 w-4 text-destructive" />;
    }
    return null;
  };

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium flex items-center gap-2">
        {label}
        {getStatusIcon()}
      </Label>
      <Select value={value || ""} onValueChange={onChange}>
        <SelectTrigger className={cn(
          "rounded-lg transition-colors",
          value?.toLowerCase() === "ok" && "border-success/50 bg-success/5",
          value?.toLowerCase() === "fail" && "border-destructive/50 bg-destructive/5"
        )}>
          <SelectValue placeholder="-- Select --" />
        </SelectTrigger>
        <SelectContent>
          {TEST_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              <span className="flex items-center gap-2">
                {opt.value === "OK" && <CheckCircle2 className="h-3 w-3 text-success" />}
                {opt.value === "Fail" && <XCircle className="h-3 w-3 text-destructive" />}
                {opt.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export const QCUpdateDialog = ({ item, open, onOpenChange }: QCUpdateDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: products } = useProducts();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    qc_date: new Date().toISOString().split("T")[0],
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
    qc_result: "Pending",
    ip_address: "",
    checked_by: "",
    update_notes: "",
  });

  // Reset and load item data when dialog opens
  useEffect(() => {
    if (open && item) {
      setFormData({
        qc_date: item.qc_date 
          ? new Date(item.qc_date).toISOString().split("T")[0] 
          : new Date().toISOString().split("T")[0],
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
        update_notes: "",
      });
    } else if (open && !item) {
      // Reset form for new entry
      setFormData({
        qc_date: new Date().toISOString().split("T")[0],
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
        qc_result: "Pending",
        ip_address: "",
        checked_by: "",
        update_notes: "",
      });
    }
  }, [item, open]);

  // Auto-calculate final status when tests change
  useEffect(() => {
    if (!open) return;
    const calculatedStatus = calculateFinalStatus(formData);
    if (calculatedStatus !== formData.qc_result) {
      setFormData((prev) => ({ ...prev, qc_result: calculatedStatus }));
    }
  }, [
    open,
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
    ? formData.category 
      ? products.filter((p) => p.category === formData.category)
      : products
    : [];

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      category,
      product_name: "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serial_number.trim()) {
      toast({
        title: "Validation Error",
        description: "Serial number is required",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const updateData = {
        qc_date: formData.qc_date || null,
        product_name: formData.product_name || (item?.product_name ?? "Unknown"),
        category: formData.category || null,
        sd_connect: formData.sd_connect || null,
        all_channels: formData.all_channels || null,
        network_test: formData.network_test || null,
        gps_test: formData.gps_test || null,
        sim_slot: formData.sim_slot || null,
        online_test: formData.online_test || null,
        camera_quality: formData.camera_quality || null,
        monitor_test: formData.monitor_test || null,
        qc_result: formData.qc_result || "Pending",
        ip_address: formData.ip_address || null,
        checked_by: formData.checked_by || null,
        updated_at: new Date().toISOString(),
      };

      if (item?.id) {
        // Update existing record
        const { error } = await supabase
          .from("inventory")
          .update(updateData)
          .eq("id", item.id);

        if (error) throw error;
      } else {
        // Create new record or upsert based on serial number
        const { error } = await supabase
          .from("inventory")
          .upsert({
            ...updateData,
            serial_number: formData.serial_number,
            status: "In Stock",
          }, {
            onConflict: "serial_number"
          });

        if (error) throw error;
      }

      // Refresh data
      await queryClient.invalidateQueries({ queryKey: ["inventory"] });

      // Create notification for admins
      createNotification(
        "QC Updated",
        `QC ${formData.qc_result} for serial ${formData.serial_number} (${formData.product_name || "Unknown product"}).`,
        "qc",
        { serial_number: formData.serial_number, qc_result: formData.qc_result }
      );

      toast({
        title: "QC Saved Successfully",
        description: `QC report for ${formData.serial_number} has been ${item?.id ? "updated" : "created"}.`,
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error("Update error:", error);
      toast({
        title: "Update Failed",
        description: error.message || "Failed to save QC record",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const hasValidItem = item && item.serial_number;
  const getStatusColor = () => {
    const status = formData.qc_result?.toLowerCase() || "";
    if (status.includes("pass")) return "text-success";
    if (status.includes("fail")) return "text-destructive";
    return "text-warning";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Edit className="h-5 w-5 text-primary" />
            Update QC - Manual Entry
          </DialogTitle>
        </DialogHeader>

        {/* Device Info Banner */}
        {hasValidItem ? (
          <div className="bg-success/10 border border-success/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-success mb-3">
              <CheckCircle className="h-5 w-5" />
              <span className="font-semibold">Device Loaded Successfully</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Serial Number</span>
                <p className="font-semibold text-foreground">{formData.serial_number}</p>
              </div>
              <div>
                <span className="text-xs text-muted-foreground uppercase tracking-wide">Model Name</span>
                <p className="font-semibold text-foreground">{formData.product_name || "Not specified"}</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-warning/10 border border-warning/30 rounded-xl p-4">
            <div className="flex items-center gap-2 text-warning mb-2">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Manual Entry Mode</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Enter serial number to create a new QC record or update an existing one.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qc_date">QC Date *</Label>
                <Input
                  id="qc_date"
                  type="date"
                  value={formData.qc_date}
                  onChange={(e) => setFormData({ ...formData, qc_date: e.target.value })}
                  className="rounded-lg"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="serial_number">Serial Number *</Label>
                <Input
                  id="serial_number"
                  value={formData.serial_number}
                  onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                  className={cn("rounded-lg", hasValidItem && "bg-muted")}
                  readOnly={!!hasValidItem}
                  placeholder="Enter serial number"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={handleCategoryChange}
                >
                  <SelectTrigger className="rounded-lg">
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
                <Label htmlFor="product_name">Product Name</Label>
                <Select
                  value={formData.product_name}
                  onValueChange={(value) => setFormData({ ...formData, product_name: value })}
                >
                  <SelectTrigger className="rounded-lg">
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
          </div>

          {/* Camera QC Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Camera className="h-4 w-4" />
              Camera & Display QC
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <TestSelect
                label="Camera Quality"
                value={formData.camera_quality}
                onChange={(value) => setFormData({ ...formData, camera_quality: value })}
              />
              <TestSelect
                label="Monitor QC Status"
                value={formData.monitor_test}
                onChange={(value) => setFormData({ ...formData, monitor_test: value })}
              />
            </div>
          </div>

          {/* Connectivity QC Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              Connectivity QC
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <TestSelect
                label="SD Connectivity"
                value={formData.sd_connect}
                onChange={(value) => setFormData({ ...formData, sd_connect: value })}
              />
              <TestSelect
                label="All Channels"
                value={formData.all_channels}
                onChange={(value) => setFormData({ ...formData, all_channels: value })}
              />
              <TestSelect
                label="Network"
                value={formData.network_test}
                onChange={(value) => setFormData({ ...formData, network_test: value })}
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <TestSelect
                label="GPS"
                value={formData.gps_test}
                onChange={(value) => setFormData({ ...formData, gps_test: value })}
              />
              <TestSelect
                label="SIM Card Slot"
                value={formData.sim_slot}
                onChange={(value) => setFormData({ ...formData, sim_slot: value })}
              />
              <TestSelect
                label="Online Status"
                value={formData.online_test}
                onChange={(value) => setFormData({ ...formData, online_test: value })}
              />
            </div>
          </div>

          {/* Final Result Section */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ClipboardCheck className="h-4 w-4" />
              Final Result
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Final QC Status</Label>
                <div className={cn(
                  "h-10 px-3 rounded-lg border flex items-center gap-2 font-semibold",
                  formData.qc_result?.toLowerCase().includes("pass") && "bg-success/10 border-success/30 text-success",
                  formData.qc_result?.toLowerCase().includes("fail") && "bg-destructive/10 border-destructive/30 text-destructive",
                  formData.qc_result === "Pending" && "bg-warning/10 border-warning/30 text-warning"
                )}>
                  {formData.qc_result?.toLowerCase().includes("pass") && <CheckCircle2 className="h-4 w-4" />}
                  {formData.qc_result?.toLowerCase().includes("fail") && <XCircle className="h-4 w-4" />}
                  {formData.qc_result === "Pending" && <AlertTriangle className="h-4 w-4" />}
                  {formData.qc_result || "Pending"}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="ip_address">IP Address</Label>
                <Input
                  id="ip_address"
                  value={formData.ip_address}
                  onChange={(e) => setFormData({ ...formData, ip_address: e.target.value })}
                  placeholder="192.168.1.100"
                  className="rounded-lg"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="checked_by">Inspector</Label>
                <Input
                  id="checked_by"
                  value={formData.checked_by}
                  onChange={(e) => setFormData({ ...formData, checked_by: e.target.value })}
                  placeholder="Inspector name"
                  className="rounded-lg"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="update_notes">Update Notes</Label>
              <Textarea
                id="update_notes"
                value={formData.update_notes}
                onChange={(e) => setFormData({ ...formData, update_notes: e.target.value })}
                placeholder="e.g., Firmware updated, screen replaced..."
                className="rounded-lg resize-none"
                rows={2}
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
              className="rounded-lg"
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="rounded-lg bg-primary hover:bg-primary/90"
            >
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
