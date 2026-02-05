import { CustomerProfile } from "@/hooks/useCustomerDetails";
import { Phone, Mail, Building2, MapPin, Hash, FileText } from "lucide-react";

interface CustomerProfileHeaderProps {
  customer: CustomerProfile;
}

export const CustomerProfileHeader = ({ customer }: CustomerProfileHeaderProps) => {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary via-primary/90 to-violet-600 p-6 text-primary-foreground shadow-lg">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Customer Code & Name */}
        <div className="space-y-1">
          <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
            Customer Code
          </p>
          <p className="text-2xl font-bold">{customer.customer_code}</p>
          <p className="text-sm text-primary-foreground/80 mt-2">
            <span className="text-xs text-primary-foreground/60">Name:</span>{" "}
            <span className="font-medium">{customer.customer_name}</span>
          </p>
        </div>

        {/* Contact */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
            Contact
          </p>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary-foreground/70" />
            <span className="font-medium">{customer.mobile_number}</span>
          </div>
          {customer.alternate_mobile && (
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <Phone className="h-3 w-3 text-primary-foreground/60" />
              <span>{customer.alternate_mobile}</span>
            </div>
          )}
          {customer.email && (
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <Mail className="h-3 w-3 text-primary-foreground/60" />
              <span>{customer.email}</span>
            </div>
          )}
        </div>

        {/* Company */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
            Company
          </p>
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary-foreground/70" />
            <span className="font-medium">
              {customer.company_name || "N/A"}
            </span>
          </div>
          {customer.gst_number && (
            <div className="flex items-center gap-2 text-sm text-primary-foreground/80">
              <FileText className="h-3 w-3 text-primary-foreground/60" />
              <span>GST: {customer.gst_number}</span>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary-foreground/70 uppercase tracking-wider">
            Location
          </p>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary-foreground/70" />
            <span className="font-medium">
              {customer.location || "N/A"}
            </span>
          </div>
          {customer.complete_address && (
            <p className="text-sm text-primary-foreground/80 line-clamp-2">
              {customer.complete_address}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
