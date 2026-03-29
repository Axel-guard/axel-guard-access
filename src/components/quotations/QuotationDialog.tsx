import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileText } from "lucide-react";
import { QuotationForm } from "./QuotationForm";

interface QuotationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillCustomerCode?: string;
  customerName?: string;
}

export const QuotationDialog = ({
  open,
  onOpenChange,
  prefillCustomerCode,
  customerName,
}: QuotationDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Create Quotation
            {customerName && (
              <span className="text-sm font-normal text-muted-foreground">— {customerName}</span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="px-6 pb-6 pt-4">
          <QuotationForm
            prefillCustomerCode={prefillCustomerCode}
            onSuccess={() => onOpenChange(false)}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};
