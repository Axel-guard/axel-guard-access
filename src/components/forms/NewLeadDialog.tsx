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
import { useCreateLead, useNextCustomerCode } from "@/hooks/useLeads";
import { useQueryClient } from "@tanstack/react-query";
import { 
  User, 
  Phone, 
  Building2, 
  FileText, 
  Mail, 
  MapPin, 
  Hash,
  Save,
  Sparkles
} from "lucide-react";

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewLeadDialog = ({ open, onOpenChange }: NewLeadDialogProps) => {
  const createLead = useCreateLead();
  const { data: nextCode, isLoading: isLoadingCode } = useNextCustomerCode();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    customerName: "",
    mobileNumber: "",
    alternateMobile: "",
    location: "",
    companyName: "",
    gstNumber: "",
    email: "",
    completeAddress: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.mobileNumber || !nextCode) return;

    await createLead.mutateAsync({
      customer_code: nextCode,
      customer_name: formData.customerName,
      mobile_number: formData.mobileNumber,
      alternate_mobile: formData.alternateMobile || undefined,
      location: formData.location || undefined,
      company_name: formData.companyName || undefined,
      gst_number: formData.gstNumber || undefined,
      email: formData.email || undefined,
      complete_address: formData.completeAddress || undefined,
      status: "New",
    });

    // Invalidate next code query so it refetches for next lead
    queryClient.invalidateQueries({ queryKey: ["leads", "nextCode"] });
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      customerName: "",
      mobileNumber: "",
      alternateMobile: "",
      location: "",
      companyName: "",
      gstNumber: "",
      email: "",
      completeAddress: "",
    });
  };

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      resetForm();
      queryClient.invalidateQueries({ queryKey: ["leads", "nextCode"] });
    }
  }, [open, queryClient]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0 overflow-hidden flex flex-col gap-0 rounded-xl border-0 shadow-2xl">
        {/* Premium Header */}
        <DialogHeader className="px-6 py-5 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border-b shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-semibold text-foreground">
                Add New Lead
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                Create a new customer lead entry
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Form Content */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
            
            {/* Customer Code Badge */}
            <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-success/10 to-success/5 border border-success/20">
              <div className="p-2.5 rounded-lg bg-success/20">
                <Hash className="h-5 w-5 text-success" />
              </div>
              <div className="flex-1">
                <Label className="text-xs font-medium text-success uppercase tracking-wider">
                  Customer Code (Auto-generated)
                </Label>
                <div className="mt-1 flex items-center gap-2">
                  {isLoadingCode ? (
                    <div className="h-8 w-20 rounded-md bg-success/20 animate-pulse" />
                  ) : (
                    <span className="text-2xl font-bold text-success tracking-wide">
                      {nextCode}
                    </span>
                  )}
                  <span className="text-xs text-success/70 bg-success/10 px-2 py-0.5 rounded-full">
                    Unique ID
                  </span>
                </div>
              </div>
            </div>

            {/* Section 1: Basic Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <User className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Basic Information
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="customerName" className="text-sm font-medium flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    Customer Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="customerName"
                    value={formData.customerName}
                    onChange={(e) =>
                      setFormData({ ...formData, customerName: e.target.value })
                    }
                    placeholder="Enter customer name"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobileNumber" className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Mobile Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, mobileNumber: e.target.value })
                    }
                    placeholder="Enter mobile number"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                    required
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="alternateMobile" className="text-sm font-medium flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    Alternate Mobile Number
                  </Label>
                  <Input
                    id="alternateMobile"
                    value={formData.alternateMobile}
                    onChange={(e) =>
                      setFormData({ ...formData, alternateMobile: e.target.value })
                    }
                    placeholder="Enter alternate mobile"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Business Information */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Building2 className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Business Information
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="companyName" className="text-sm font-medium flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                    Company Name
                  </Label>
                  <Input
                    id="companyName"
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    placeholder="Enter company name"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstNumber" className="text-sm font-medium flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                    GST Number
                  </Label>
                  <Input
                    id="gstNumber"
                    value={formData.gstNumber}
                    onChange={(e) =>
                      setFormData({ ...formData, gstNumber: e.target.value })
                    }
                    placeholder="Enter GST number"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Contact Details */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <Mail className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground uppercase tracking-wide">
                  Contact Details
                </h3>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                    Email ID
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="Enter email address"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location" className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Location
                  </Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="Enter location"
                    className="h-11 bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all"
                  />
                </div>

                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="completeAddress" className="text-sm font-medium flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    Complete Address
                  </Label>
                  <Textarea
                    id="completeAddress"
                    value={formData.completeAddress}
                    onChange={(e) =>
                      setFormData({ ...formData, completeAddress: e.target.value })
                    }
                    placeholder="Enter complete address"
                    rows={3}
                    className="bg-muted/30 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="border-t bg-muted/30 px-6 py-4 shrink-0">
            <div className="flex gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1 h-11 font-medium"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createLead.isPending || isLoadingCode}
                className="flex-[2] h-11 font-medium bg-gradient-to-r from-primary via-primary to-primary/80 hover:opacity-90 transition-opacity shadow-lg shadow-primary/25"
              >
                <Save className="h-4 w-4 mr-2" />
                {createLead.isPending ? "Saving..." : "Save Lead"}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
