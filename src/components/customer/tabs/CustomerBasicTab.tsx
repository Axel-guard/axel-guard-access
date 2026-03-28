import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Pencil, Save, X, User, Phone, Mail, Building2, MapPin, FileText, Calendar } from "lucide-react";
import { CustomerProfile, useUpdateCustomer } from "@/hooks/useCustomerDetails";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";

interface CustomerBasicTabProps {
  customer: CustomerProfile;
}

// ── InfoItem is defined OUTSIDE the parent component so React never
//    unmounts/remounts the <Input> on each keystroke (no focus loss). ──────────
interface InfoItemProps {
  icon: React.ElementType;
  label: string;
  value?: string;
  field?: keyof CustomerProfile;
  isEditing: boolean;
  formData: Partial<CustomerProfile>;
  onChange: (field: keyof CustomerProfile, value: string) => void;
}

const InfoItem = ({ icon: Icon, label, value, field, isEditing, formData, onChange }: InfoItemProps) => (
  <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
      <Icon className="h-4 w-4 text-primary" />
    </div>
    <div className="flex-1 min-w-0">
      <Label className="text-xs text-muted-foreground font-medium">{label}</Label>
      {isEditing && field ? (
        <Input
          value={(formData[field] as string) || ""}
          onChange={(e) => onChange(field, e.target.value)}
          className="mt-1 h-8"
        />
      ) : (
        <p className="text-sm font-medium text-foreground truncate">{value || "N/A"}</p>
      )}
    </div>
  </div>
);

export const CustomerBasicTab = ({ customer }: CustomerBasicTabProps) => {
  const { isAdmin } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<CustomerProfile>>(customer);
  const updateCustomer = useUpdateCustomer();

  const handleChange = (field: keyof CustomerProfile, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    try {
      await updateCustomer.mutateAsync({ customerCode: customer.customer_code, updates: formData });
      setIsEditing(false);
    } catch {
      // Error handled in hook
    }
  };

  const handleCancel = () => {
    setFormData(customer);
    setIsEditing(false);
  };

  const itemProps = { isEditing, formData, onChange: handleChange };

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Basic Information</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{customer.status || "New"}</Badge>
          {isAdmin && !isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" /> Edit
            </Button>
          )}
          {isEditing && (
            <>
              <Button variant="outline" size="sm" onClick={handleCancel} disabled={updateCustomer.isPending}>
                <X className="h-4 w-4 mr-2" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={updateCustomer.isPending}>
                <Save className="h-4 w-4 mr-2" /> {updateCustomer.isPending ? "Saving…" : "Save"}
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Customer Code — read-only */}
          <InfoItem icon={User} label="Customer Code" value={customer.customer_code} {...itemProps} />
          <InfoItem icon={User} label="Customer Name" value={formData.customer_name} field="customer_name" {...itemProps} />
          <InfoItem icon={Phone} label="Mobile Number" value={formData.mobile_number} field="mobile_number" {...itemProps} />
          <InfoItem icon={Phone} label="Alternate Mobile" value={formData.alternate_mobile} field="alternate_mobile" {...itemProps} />
          <InfoItem icon={Mail} label="Email Address" value={formData.email} field="email" {...itemProps} />
          <InfoItem icon={Building2} label="Company Name" value={formData.company_name} field="company_name" {...itemProps} />
          <InfoItem icon={FileText} label="GST Number" value={formData.gst_number} field="gst_number" {...itemProps} />
          <InfoItem icon={MapPin} label="Location / City" value={formData.location} field="location" {...itemProps} />
          <InfoItem
            icon={Calendar}
            label="Created Date"
            value={customer.created_at ? format(new Date(customer.created_at), "dd MMM yyyy") : undefined}
            {...itemProps}
          />
        </div>

        {/* Full Address */}
        <div className="mt-4 p-3 rounded-lg bg-muted/30">
          <Label className="text-xs text-muted-foreground font-medium">Complete Address</Label>
          {isEditing ? (
            <Input
              value={formData.complete_address || ""}
              onChange={(e) => handleChange("complete_address", e.target.value)}
              className="mt-1"
              placeholder="Enter complete address…"
            />
          ) : (
            <p className="text-sm font-medium text-foreground mt-1">{customer.complete_address || "N/A"}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
