import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useUpdateSale } from "@/hooks/useSales";
import { useEmployees } from "@/hooks/useEmployees";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { createNotification } from "@/hooks/useNotifications";
import { toast } from "sonner";
import { Pencil } from "lucide-react";

interface EditSaleDialogProps {
  sale: {
    order_id: string;
    customer_code: string;
    customer_name?: string | null;
    company_name?: string | null;
    employee_name: string;
    sale_type: string;
    total_amount: number;
    amount_received?: number | null;
    balance_amount?: number | null;
    subtotal: number;
    gst_amount?: number | null;
    courier_cost?: number | null;
    remarks?: string | null;
  } | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditSaleDialog = ({ sale, open, onOpenChange }: EditSaleDialogProps) => {
  const { user } = useAuth();
  const { data: employees = [] } = useEmployees();
  const updateSale = useUpdateSale();

  const [employeeName, setEmployeeName] = useState("");
  const [saleType, setSaleType] = useState("");
  const [totalAmount, setTotalAmount] = useState(0);
  const [amountReceived, setAmountReceived] = useState(0);
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (sale) {
      setEmployeeName(sale.employee_name);
      setSaleType(sale.sale_type);
      setTotalAmount(Number(sale.total_amount));
      setAmountReceived(Number(sale.amount_received || 0));
      setRemarks(sale.remarks || "");
    }
  }, [sale]);

  if (!sale) return null;

  const balanceAmount = Math.max(0, totalAmount - amountReceived);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sale) return;

    const oldValues: Record<string, any> = {};
    const newValues: Record<string, any> = {};

    if (employeeName !== sale.employee_name) {
      oldValues.employee_name = sale.employee_name;
      newValues.employee_name = employeeName;
    }
    if (saleType !== sale.sale_type) {
      oldValues.sale_type = sale.sale_type;
      newValues.sale_type = saleType;
    }
    if (totalAmount !== Number(sale.total_amount)) {
      oldValues.total_amount = Number(sale.total_amount);
      newValues.total_amount = totalAmount;
    }
    if (amountReceived !== Number(sale.amount_received || 0)) {
      oldValues.amount_received = Number(sale.amount_received || 0);
      newValues.amount_received = amountReceived;
    }
    if (remarks !== (sale.remarks || "")) {
      oldValues.remarks = sale.remarks;
      newValues.remarks = remarks;
    }

    if (Object.keys(newValues).length === 0) {
      toast.info("No changes to save.");
      return;
    }

    // Always recalculate balance
    const updates: any = {
      ...newValues,
      balance_amount: Math.max(0, totalAmount - amountReceived),
    };

    try {
      await updateSale.mutateAsync({ orderId: sale.order_id, updates });

      // Log the edit
      await supabase.from("sale_edit_logs").insert({
        order_id: sale.order_id,
        edited_by: user?.id,
        edit_type: newValues.employee_name ? "employee_change" : "update",
        old_values: oldValues,
        new_values: newValues,
      });

      // If employee changed, send notifications
      if (newValues.employee_name) {
        await createNotification(
          "Sale Reassigned",
          `Sale ${sale.order_id} reassigned from ${sale.employee_name} to ${employeeName}`,
          "sale",
          { order_id: sale.order_id, old_employee: sale.employee_name, new_employee: employeeName }
        );
      }

      onOpenChange(false);
    } catch (error: any) {
      toast.error(`Failed to update sale: ${error.message}`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Sale - {sale.order_id}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Employee Assignment */}
          <div className="space-y-2">
            <Label>Assigned Employee</Label>
            <Select value={employeeName} onValueChange={setEmployeeName}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {employees.map((emp) => (
                  <SelectItem key={emp.id} value={emp.name}>
                    {emp.name}
                  </SelectItem>
                ))}
                {/* Keep current value if not in list */}
                {!employees.find(e => e.name === sale.employee_name) && (
                  <SelectItem value={sale.employee_name}>{sale.employee_name}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Sale Type */}
          <div className="space-y-2">
            <Label>Sale Type</Label>
            <Select value={saleType} onValueChange={setSaleType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="With">With GST</SelectItem>
                <SelectItem value="Without">Without GST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amounts */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Amount</Label>
              <Input
                type="number"
                step="0.01"
                value={totalAmount}
                onChange={(e) => setTotalAmount(Number(e.target.value))}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount Received</Label>
              <Input
                type="number"
                step="0.01"
                value={amountReceived}
                onChange={(e) => setAmountReceived(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Balance display */}
          <div className="bg-muted/50 rounded-lg p-3 flex justify-between items-center">
            <span className="text-sm text-muted-foreground">Balance Amount</span>
            <span className={`font-bold ${balanceAmount > 0 ? "text-destructive" : "text-success"}`}>
              ₹{balanceAmount.toLocaleString()}
            </span>
          </div>

          {/* Remarks */}
          <div className="space-y-2">
            <Label>Remarks</Label>
            <Input
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Optional remarks"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={updateSale.isPending}>
              {updateSale.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
