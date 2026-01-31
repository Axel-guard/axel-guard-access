import { useState } from "react";
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
import { useCreateLead } from "@/hooks/useLeads";

interface NewLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const NewLeadDialog = ({ open, onOpenChange }: NewLeadDialogProps) => {
  const createLead = useCreateLead();

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

  const generateCustomerCode = () => {
    return `LEAD${Date.now().toString().slice(-6)}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.customerName || !formData.mobileNumber) return;

    await createLead.mutateAsync({
      customer_code: generateCustomerCode(),
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Add New Lead</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="customerName">Customer Name *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              placeholder="Enter customer name"
              required
            />
          </div>

          <div className="grid gap-4 grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="mobileNumber">Mobile Number *</Label>
              <Input
                id="mobileNumber"
                value={formData.mobileNumber}
                onChange={(e) =>
                  setFormData({ ...formData, mobileNumber: e.target.value })
                }
                placeholder="Enter mobile"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternateMobile">Alternate Mobile</Label>
              <Input
                id="alternateMobile"
                value={formData.alternateMobile}
                onChange={(e) =>
                  setFormData({ ...formData, alternateMobile: e.target.value })
                }
                placeholder="Enter alternate"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) =>
                setFormData({ ...formData, location: e.target.value })
              }
              placeholder="Enter location"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="companyName">Company Name</Label>
            <Input
              id="companyName"
              value={formData.companyName}
              onChange={(e) =>
                setFormData({ ...formData, companyName: e.target.value })
              }
              placeholder="Enter company name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="gstNumber">GST Number</Label>
            <Input
              id="gstNumber"
              value={formData.gstNumber}
              onChange={(e) =>
                setFormData({ ...formData, gstNumber: e.target.value })
              }
              placeholder="Enter GST number"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email ID</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="Enter email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="completeAddress">Complete Address</Label>
            <Textarea
              id="completeAddress"
              value={formData.completeAddress}
              onChange={(e) =>
                setFormData({ ...formData, completeAddress: e.target.value })
              }
              placeholder="Enter complete address"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createLead.isPending}
              className="bg-[image:var(--gradient-primary)]"
            >
              {createLead.isPending ? "Saving..." : "Save Lead"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
