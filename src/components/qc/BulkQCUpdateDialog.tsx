import { useState, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Zap, AlertTriangle } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateBulkQCRequest, useMasterAdminBulkApply } from "@/hooks/useBulkQCRequests";

const QC_VALUES = [
  { value: "QC Pass", label: "QC Pass" },
  { value: "N/A", label: "Not Applicable (N/A)" },
];

export const BulkQCUpdateDialog = () => {
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [selectedQCValue, setSelectedQCValue] = useState("");

  const { data: inventory } = useInventory();
  const { isMasterAdmin } = useAuth();
  const createBulkRequest = useCreateBulkQCRequest();
  const masterBulkApply = useMasterAdminBulkApply();

  // Products that have pending QC devices
  const productsWithPending = useMemo(() => {
    if (!inventory) return [];
    const productMap: Record<string, number> = {};
    inventory.forEach((item) => {
      if (item.qc_result === "Pending" || !item.qc_result) {
        productMap[item.product_name] = (productMap[item.product_name] || 0) + 1;
      }
    });
    return Object.entries(productMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [inventory]);

  const selectedPendingCount = useMemo(() => {
    return productsWithPending.find((p) => p.name === selectedProduct)?.count || 0;
  }, [productsWithPending, selectedProduct]);

  const handleSubmit = () => {
    if (!selectedProduct || !selectedQCValue) return;
    setConfirmOpen(true);
  };

  const handleConfirm = () => {
    if (isMasterAdmin) {
      masterBulkApply.mutate(
        { product_name: selectedProduct, qc_value: selectedQCValue },
        {
          onSuccess: () => {
            setConfirmOpen(false);
            setOpen(false);
            setSelectedProduct("");
            setSelectedQCValue("");
          },
        }
      );
    } else {
      createBulkRequest.mutate(
        {
          product_name: selectedProduct,
          qc_value: selectedQCValue,
          total_devices: selectedPendingCount,
        },
        {
          onSuccess: () => {
            setConfirmOpen(false);
            setOpen(false);
            setSelectedProduct("");
            setSelectedQCValue("");
          },
        }
      );
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10">
            <Zap className="h-4 w-4" />
            Bulk QC Update
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Bulk QC Update
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            {productsWithPending.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-warning" />
                <p className="font-medium">No pending QC devices</p>
                <p className="text-sm">All devices have been QC checked.</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label>Select Product</Label>
                  <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="-- Select Product --" />
                    </SelectTrigger>
                    <SelectContent>
                      {productsWithPending.map((p) => (
                        <SelectItem key={p.name} value={p.name}>
                          {p.name} ({p.count} pending)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>QC Value to Apply</Label>
                  <Select value={selectedQCValue} onValueChange={setSelectedQCValue}>
                    <SelectTrigger className="rounded-lg">
                      <SelectValue placeholder="-- Select QC Value --" />
                    </SelectTrigger>
                    <SelectContent>
                      {QC_VALUES.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Only QC Pass and N/A are allowed for bulk updates. QC Fail must be done individually.
                  </p>
                </div>

                {selectedProduct && selectedQCValue && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-sm">
                      This will apply <strong>{selectedQCValue}</strong> to{" "}
                      <strong>{selectedPendingCount}</strong> pending{" "}
                      <strong>{selectedProduct}</strong> devices.
                    </p>
                    {!isMasterAdmin && (
                      <p className="text-xs text-muted-foreground mt-1">
                        A request will be sent to Master Admin for approval.
                      </p>
                    )}
                  </div>
                )}

                <Button
                  onClick={handleSubmit}
                  disabled={!selectedProduct || !selectedQCValue}
                  className="w-full rounded-lg gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isMasterAdmin
                    ? `Apply to ${selectedPendingCount} devices`
                    : `Send Request for ${selectedPendingCount} devices`}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Bulk QC Update</AlertDialogTitle>
            <AlertDialogDescription>
              {isMasterAdmin
                ? `This will immediately apply "${selectedQCValue}" to all ${selectedPendingCount} pending ${selectedProduct} devices. This action cannot be undone.`
                : `This will send a request to the Master Admin to apply "${selectedQCValue}" to ${selectedPendingCount} pending ${selectedProduct} devices.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {isMasterAdmin ? "Apply Now" : "Send for Approval"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
