import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Save, Loader2, FileText } from "lucide-react";
import { useProducts } from "@/hooks/useProducts";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";

interface InventoryRow {
  id: string;
  serialNumber: string;
  category: string;
  productName: string;
  inDate: string;
}

const createEmptyRow = (): InventoryRow => ({
  id: crypto.randomUUID(),
  serialNumber: "",
  category: "",
  productName: "",
  inDate: format(new Date(), "yyyy-MM-dd"),
});

export const AddInventoryDialog = () => {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<InventoryRow[]>([createEmptyRow()]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: products } = useProducts();
  const queryClient = useQueryClient();
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Get unique categories from products
  const categories = [...new Set(products?.map((p) => p.category) || [])].sort();

  // Get products filtered by category
  const getProductsByCategory = (category: string) => {
    return products?.filter((p) => p.category === category) || [];
  };

  const updateRow = (id: string, field: keyof InventoryRow, value: string) => {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        
        // If category changes, reset product name
        if (field === "category") {
          return { ...row, category: value, productName: "" };
        }
        
        return { ...row, [field]: value };
      })
    );
  };

  const addRow = () => {
    const newRow = createEmptyRow();
    setRows((prev) => [...prev, newRow]);
    
    // Focus on new serial number input after render
    setTimeout(() => {
      const lastIndex = rows.length;
      inputRefs.current[lastIndex]?.focus();
    }, 100);
  };

  const removeRow = (id: string) => {
    if (rows.length === 1) {
      // Reset the only row instead of removing
      setRows([createEmptyRow()]);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== id));
  };

  const handleKeyDown = (e: React.KeyboardEvent, rowIndex: number) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // If it's the last row and has a serial number, add a new row
      if (rowIndex === rows.length - 1 && rows[rowIndex].serialNumber) {
        addRow();
      }
    }
  };

  const validateRows = () => {
    const validRows = rows.filter(
      (row) => row.serialNumber && row.category && row.productName
    );
    
    if (validRows.length === 0) {
      toast.error("Please fill in at least one complete row");
      return null;
    }

    // Check for duplicate serial numbers
    const serials = validRows.map((r) => r.serialNumber.trim().toUpperCase());
    const duplicates = serials.filter((s, i) => serials.indexOf(s) !== i);
    if (duplicates.length > 0) {
      toast.error(`Duplicate serial numbers: ${[...new Set(duplicates)].join(", ")}`);
      return null;
    }

    return validRows;
  };

  const handleSubmit = async () => {
    const validRows = validateRows();
    if (!validRows) return;

    setIsSubmitting(true);

    try {
      // Prepare inventory records with auto QC entry (status = Pending)
      const inventoryRecords = validRows.map((row) => ({
        serial_number: row.serialNumber.trim().toUpperCase(),
        category: row.category,
        product_name: row.productName,
        in_date: row.inDate,
        status: "In Stock",
        qc_result: "Pending", // Auto-create QC entry with Pending status
      }));

      // Check for existing serial numbers
      const serialNumbers = inventoryRecords.map((r) => r.serial_number);
      const { data: existing } = await supabase
        .from("inventory")
        .select("serial_number")
        .in("serial_number", serialNumbers);

      if (existing && existing.length > 0) {
        const existingSerials = existing.map((e) => e.serial_number);
        toast.error(
          `These serial numbers already exist: ${existingSerials.join(", ")}`
        );
        setIsSubmitting(false);
        return;
      }

      // Insert all records
      const { error } = await supabase.from("inventory").insert(inventoryRecords);

      if (error) throw error;

      toast.success(
        `${validRows.length} device(s) added successfully! QC entries created automatically.`
      );

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-report"] });
      queryClient.invalidateQueries({ queryKey: ["qc-report"] });

      // Reset and close
      setRows([createEmptyRow()]);
      setOpen(false);
    } catch (error: any) {
      console.error("Error adding inventory:", error);
      toast.error(error.message || "Failed to add inventory items");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setRows([createEmptyRow()]);
    setOpen(false);
  };

  // Focus first input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Add Inventory
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Plus className="h-5 w-5 text-primary" />
            Add Multiple Inventory Items
          </DialogTitle>
        </DialogHeader>

        {/* Quick Guide */}
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 mb-4">
          <h4 className="font-semibold text-primary flex items-center gap-2 mb-2">
            <FileText className="h-4 w-4" />
            Quick Guide:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Scan barcode in Serial Number field</li>
            <li>Select Category → Product Name appears automatically</li>
            <li>Click "Add Row" or press Enter to add more devices</li>
            <li>Date is auto-filled with today's date</li>
            <li>Click "Submit All" to save all devices at once</li>
          </ul>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-12 gap-3 mb-2 px-1">
          <div className="col-span-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Serial Number *
            </Label>
          </div>
          <div className="col-span-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Category *
            </Label>
          </div>
          <div className="col-span-3">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Product Name *
            </Label>
          </div>
          <div className="col-span-2">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Date *
            </Label>
          </div>
          <div className="col-span-1">
            <Label className="text-xs font-semibold uppercase text-muted-foreground">
              Action
            </Label>
          </div>
        </div>

        {/* Rows */}
        <div className="space-y-3">
          {rows.map((row, index) => (
            <div
              key={row.id}
              className="grid grid-cols-12 gap-3 items-center p-2 rounded-lg bg-muted/30 border border-border/50"
            >
              {/* Serial Number */}
              <div className="col-span-3">
                <Input
                  ref={(el) => (inputRefs.current[index] = el)}
                  placeholder="Scan barcode..."
                  value={row.serialNumber}
                  onChange={(e) =>
                    updateRow(row.id, "serialNumber", e.target.value)
                  }
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="font-mono"
                />
              </div>

              {/* Category */}
              <div className="col-span-3">
                <Select
                  value={row.category}
                  onValueChange={(value) => updateRow(row.id, "category", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="-- Select --" />
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

              {/* Product Name */}
              <div className="col-span-3">
                <Select
                  value={row.productName}
                  onValueChange={(value) =>
                    updateRow(row.id, "productName", value)
                  }
                  disabled={!row.category}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        row.category
                          ? "-- Select Product --"
                          : "-- Select Category First --"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {getProductsByCategory(row.category).map((product) => (
                      <SelectItem key={product.id} value={product.product_name}>
                        {product.product_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date */}
              <div className="col-span-2">
                <Input
                  type="date"
                  value={row.inDate}
                  onChange={(e) => updateRow(row.id, "inDate", e.target.value)}
                />
              </div>

              {/* Delete */}
              <div className="col-span-1 flex justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeRow(row.id)}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* Add Row Button */}
        <div className="flex justify-center mt-4">
          <Button variant="default" onClick={addRow} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Another Row
          </Button>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="secondary" onClick={handleCancel} disabled={isSubmitting}>
            ✕ Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="gap-2 bg-success hover:bg-success/90"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Submit All Devices
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
