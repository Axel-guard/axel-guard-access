import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Phone,
  Plus,
  MoreHorizontal,
  FileText,
  ShoppingCart,
  ChevronDown,
  Edit,
  Trash2,
  User,
  Loader2,
} from "lucide-react";
import { LogCallDialog } from "@/components/crm/LogCallDialog";
import { QuotationDialog } from "@/components/quotations/QuotationDialog";
import { NewSaleDialog, SalePrefill } from "@/components/forms/NewSaleDialog";
import { CustomerProfile, useUpdateCustomer } from "@/hooks/useCustomerDetails";
import { useDeleteLead } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface CustomerActionBarProps {
  customer: CustomerProfile;
  leadId?: string | null;
}

interface EditCustomerDialogProps {
  customer: CustomerProfile;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const EditCustomerDialog = ({ customer, open, onOpenChange }: EditCustomerDialogProps) => {
  const updateCustomer = useUpdateCustomer();
  const [form, setForm] = useState({
    customer_name: customer.customer_name,
    company_name: customer.company_name || "",
    mobile_number: customer.mobile_number,
    alternate_mobile: customer.alternate_mobile || "",
    email: customer.email || "",
    location: customer.location || "",
    complete_address: customer.complete_address || "",
    gst_number: customer.gst_number || "",
  });

  const field = (key: keyof typeof form, label: string, type = "text") => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Input
        type={type}
        className="mt-1"
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </div>
  );

  const handleSave = async () => {
    await updateCustomer.mutateAsync({
      customerCode: customer.customer_code,
      updates: form,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Edit Customer — {customer.customer_code}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-1">
          {field("customer_name", "Customer Name *")}
          {field("company_name", "Company Name")}
          <div className="grid grid-cols-2 gap-3">
            {field("mobile_number", "Mobile Number")}
            {field("alternate_mobile", "Alternate Mobile")}
          </div>
          {field("email", "Email", "email")}
          {field("location", "City / Location")}
          {field("complete_address", "Complete Address")}
          {field("gst_number", "GST Number")}
        </div>
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateCustomer.isPending}>
            {updateCustomer.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const CustomerActionBar = ({ customer, leadId }: CustomerActionBarProps) => {
  const navigate = useNavigate();
  const { isAdmin, isMasterAdmin } = useAuth();
  const deleteLead = useDeleteLead();

  const [logCallOpen, setLogCallOpen] = useState(false);
  const [quotationOpen, setQuotationOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const salePrefill: SalePrefill = {
    customerCode: customer.customer_code,
    customerName: customer.customer_name,
    companyName: customer.company_name,
    customerContact: customer.mobile_number,
    location: customer.location,
    email: customer.email,
  };

  const handleDelete = async () => {
    if (!leadId) {
      toast.error("Cannot delete: lead ID not found");
      return;
    }
    await deleteLead.mutateAsync(leadId);
    setDeleteConfirmOpen(false);
    navigate("/leads");
    toast.success("Customer deleted");
  };

  return (
    <>
      {/* ── Action Bar ── */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Log Call */}
        <Button
          onClick={() => setLogCallOpen(true)}
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9"
          size="sm"
        >
          <Phone className="h-4 w-4" />
          Log Call
        </Button>

        {/* Create Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="default" size="sm" className="gap-1.5 h-9 shadow-sm">
              <Plus className="h-4 w-4" />
              Create
              <ChevronDown className="h-3 w-3 opacity-70" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-44">
            <DropdownMenuItem onClick={() => setQuotationOpen(true)}>
              <FileText className="mr-2 h-4 w-4 text-primary" />
              Create Quotation
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setSaleOpen(true)}>
              <ShoppingCart className="mr-2 h-4 w-4 text-emerald-600" />
              Create Sale
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* More Options */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 w-9 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => navigate(`/customer-details`, { state: { preloadCode: customer.customer_code } })}>
              <User className="mr-2 h-4 w-4" />
              View Full Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Customer
            </DropdownMenuItem>
            {(isAdmin || isMasterAdmin) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => setDeleteConfirmOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Customer
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Dialogs ── */}
      <LogCallDialog
        open={logCallOpen}
        onOpenChange={setLogCallOpen}
        leadId={leadId}
        customerCode={customer.customer_code}
        leadName={customer.customer_name}
        currentStage={(customer as any).pipeline_stage}
      />
      <QuotationDialog
        open={quotationOpen}
        onOpenChange={setQuotationOpen}
        prefillCustomerCode={customer.customer_code}
        customerName={customer.customer_name}
      />
      <NewSaleDialog
        open={saleOpen}
        onOpenChange={setSaleOpen}
        prefill={salePrefill}
      />
      <EditCustomerDialog
        customer={customer}
        open={editOpen}
        onOpenChange={setEditOpen}
      />

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-4 w-4" />
              Delete Customer
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>{customer.customer_name}</strong> ({customer.customer_code})?
            This will remove the lead record and cannot be undone.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleteLead.isPending}
            >
              {deleteLead.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
