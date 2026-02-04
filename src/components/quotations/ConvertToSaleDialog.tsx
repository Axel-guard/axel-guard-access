import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEmployees } from "@/hooks/useEmployees";
import { Loader2 } from "lucide-react";

interface ConvertToSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (employeeName: string) => void;
  isConverting: boolean;
  quotationNo: string;
}

export const ConvertToSaleDialog = ({
  open,
  onOpenChange,
  onConfirm,
  isConverting,
  quotationNo,
}: ConvertToSaleDialogProps) => {
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [error, setError] = useState<string>("");

  const handleConfirm = () => {
    if (!selectedEmployee) {
      setError("Please select employee");
      return;
    }
    setError("");
    onConfirm(selectedEmployee);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setSelectedEmployee("");
      setError("");
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Employee for this Sale</DialogTitle>
          <DialogDescription>
            Converting Quotation <span className="font-semibold text-primary">{quotationNo}</span> to Sale.
            Please select the employee responsible for this sale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="employee" className="text-sm font-medium">
              Employee Name <span className="text-destructive">*</span>
            </Label>
            <Select
              value={selectedEmployee}
              onValueChange={(value) => {
                setSelectedEmployee(value);
                setError("");
              }}
            >
              <SelectTrigger id="employee" className={error ? "border-destructive" : ""}>
                <SelectValue placeholder="Select Employee" />
              </SelectTrigger>
              <SelectContent>
                {employeesLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                ) : employees && employees.length > 0 ? (
                  employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.name}>
                      {emp.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="py-2 text-center text-sm text-muted-foreground">
                    No active employees found
                  </div>
                )}
              </SelectContent>
            </Select>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isConverting || employeesLoading}
          >
            {isConverting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              "Confirm & Convert"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
