 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
 } from "@/components/ui/dialog";
 import { Badge } from "@/components/ui/badge";
 import { Lead } from "@/hooks/useLeads";
 import { format } from "date-fns";
 import { Phone, Mail, MapPin, Building, FileText } from "lucide-react";
 
 interface LeadDetailsDialogProps {
   lead: Lead | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 const getStatusColor = (status: string) => {
   switch (status) {
     case "New":
       return "bg-info/10 text-info border-info/20";
     case "Contacted":
       return "bg-warning/10 text-warning border-warning/20";
     case "Interested":
       return "bg-success/10 text-success border-success/20";
     case "Not Interested":
       return "bg-destructive/10 text-destructive border-destructive/20";
     case "Converted":
       return "bg-primary/10 text-primary border-primary/20";
     default:
       return "bg-muted text-muted-foreground";
   }
 };
 
 export const LeadDetailsDialog = ({ lead, open, onOpenChange }: LeadDetailsDialogProps) => {
   if (!lead) return null;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-md">
         <DialogHeader>
           <DialogTitle className="flex items-center gap-2">
             Lead Details
             <Badge className={getStatusColor(lead.status)}>{lead.status}</Badge>
           </DialogTitle>
         </DialogHeader>
         <div className="space-y-4">
           <div>
             <p className="text-lg font-semibold">{lead.customer_name}</p>
             <p className="text-sm text-muted-foreground">Code: {lead.customer_code}</p>
           </div>
 
           <div className="grid gap-3">
             <div className="flex items-center gap-2">
               <Phone className="h-4 w-4 text-muted-foreground" />
               <span>{lead.mobile_number}</span>
               {lead.alternate_mobile && (
                 <span className="text-muted-foreground">/ {lead.alternate_mobile}</span>
               )}
             </div>
 
             {lead.email && (
               <div className="flex items-center gap-2">
                 <Mail className="h-4 w-4 text-muted-foreground" />
                 <span>{lead.email}</span>
               </div>
             )}
 
             {lead.company_name && (
               <div className="flex items-center gap-2">
                 <Building className="h-4 w-4 text-muted-foreground" />
                 <span>{lead.company_name}</span>
               </div>
             )}
 
             {lead.location && (
               <div className="flex items-center gap-2">
                 <MapPin className="h-4 w-4 text-muted-foreground" />
                 <span>{lead.location}</span>
               </div>
             )}
 
             {lead.gst_number && (
               <div className="flex items-center gap-2">
                 <FileText className="h-4 w-4 text-muted-foreground" />
                 <span>GST: {lead.gst_number}</span>
               </div>
             )}
 
             {lead.complete_address && (
               <div className="pt-2 border-t">
                 <p className="text-sm text-muted-foreground mb-1">Address</p>
                 <p className="text-sm">{lead.complete_address}</p>
               </div>
             )}
           </div>
 
           {lead.created_at && (
             <p className="text-xs text-muted-foreground">
               Created on {format(new Date(lead.created_at), "dd MMM yyyy, hh:mm a")}
             </p>
           )}
         </div>
       </DialogContent>
     </Dialog>
   );
 };