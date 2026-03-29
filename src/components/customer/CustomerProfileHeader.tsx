import { CustomerProfile } from "@/hooks/useCustomerDetails";
import { Phone, Mail, Building2, MapPin, FileText } from "lucide-react";
import { CustomerActionBar } from "./CustomerActionBar";

interface CustomerProfileHeaderProps {
  customer: CustomerProfile;
  leadId?: string | null;
}

export const CustomerProfileHeader = ({ customer, leadId }: CustomerProfileHeaderProps) => {
  return (
    <div className="rounded-xl bg-gradient-to-r from-primary via-primary/90 to-violet-600 shadow-lg overflow-hidden">
      {/* Info grid */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-primary-foreground">
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
              <span className="truncate">{customer.email}</span>
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
            <span className="font-medium">{customer.company_name || "N/A"}</span>
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
            <span className="font-medium">{customer.location || "N/A"}</span>
          </div>
          {customer.complete_address && (
            <p className="text-sm text-primary-foreground/80 line-clamp-2">
              {customer.complete_address}
            </p>
          )}
        </div>
      </div>

      {/* ── Action bar strip ── */}
      <div className="px-6 py-3 border-t border-white/20 bg-black/10 backdrop-blur-sm flex items-center justify-between gap-4 flex-wrap">
        <p className="text-xs text-primary-foreground/60 hidden sm:block">
          CRM Actions
        </p>
        <CustomerActionBar customer={customer} leadId={leadId} />
      </div>
    </div>
  );
};
