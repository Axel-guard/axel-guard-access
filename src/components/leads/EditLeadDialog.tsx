 import { useState, useEffect } from "react";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import { Button } from "@/components/ui/button";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Lead, useUpdateLead } from "@/hooks/useLeads";
 
 const STATUSES = ["New", "Contacted", "Interested", "Not Interested", "Converted"];
 
 interface EditLeadDialogProps {
   lead: Lead | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export const EditLeadDialog = ({ lead, open, onOpenChange }: EditLeadDialogProps) => {
   const updateLead = useUpdateLead();
   const [formData, setFormData] = useState({
     customer_name: "",
     mobile_number: "",
     alternate_mobile: "",
     email: "",
     company_name: "",
     location: "",
     gst_number: "",
     complete_address: "",
     status: "New",
   });
 
   useEffect(() => {
     if (lead) {
       setFormData({
         customer_name: lead.customer_name || "",
         mobile_number: lead.mobile_number || "",
         alternate_mobile: lead.alternate_mobile || "",
         email: lead.email || "",
         company_name: lead.company_name || "",
         location: lead.location || "",
         gst_number: lead.gst_number || "",
         complete_address: lead.complete_address || "",
         status: lead.status || "New",
       });
     }
   }, [lead]);
 
   const handleSubmit = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!lead?.id) return;
 
     await updateLead.mutateAsync({
       id: lead.id,
       updates: formData,
     });
     onOpenChange(false);
   };
 
   if (!lead) return null;
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
         <DialogHeader>
           <DialogTitle>Edit Lead - {lead.customer_code}</DialogTitle>
         </DialogHeader>
         <form onSubmit={handleSubmit} className="space-y-4">
           <div className="grid gap-4 sm:grid-cols-2">
             <div className="space-y-2">
               <Label htmlFor="customer_name">Customer Name *</Label>
               <Input
                 id="customer_name"
                 value={formData.customer_name}
                 onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="mobile_number">Mobile Number *</Label>
               <Input
                 id="mobile_number"
                 value={formData.mobile_number}
                 onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value })}
                 required
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="alternate_mobile">Alternate Mobile</Label>
               <Input
                 id="alternate_mobile"
                 value={formData.alternate_mobile}
                 onChange={(e) => setFormData({ ...formData, alternate_mobile: e.target.value })}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="email">Email</Label>
               <Input
                 id="email"
                 type="email"
                 value={formData.email}
                 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="company_name">Company Name</Label>
               <Input
                 id="company_name"
                 value={formData.company_name}
                 onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="location">Location</Label>
               <Input
                 id="location"
                 value={formData.location}
                 onChange={(e) => setFormData({ ...formData, location: e.target.value })}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="gst_number">GST Number</Label>
               <Input
                 id="gst_number"
                 value={formData.gst_number}
                 onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
               />
             </div>
             <div className="space-y-2">
               <Label htmlFor="status">Status</Label>
               <Select
                 value={formData.status}
                 onValueChange={(value) => setFormData({ ...formData, status: value })}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   {STATUSES.map((status) => (
                     <SelectItem key={status} value={status}>
                       {status}
                     </SelectItem>
                   ))}
                 </SelectContent>
               </Select>
             </div>
           </div>
           <div className="space-y-2">
             <Label htmlFor="complete_address">Complete Address</Label>
             <Textarea
               id="complete_address"
               value={formData.complete_address}
               onChange={(e) => setFormData({ ...formData, complete_address: e.target.value })}
               rows={3}
             />
           </div>
           <DialogFooter>
             <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
               Cancel
             </Button>
             <Button type="submit" disabled={updateLead.isPending}>
               {updateLead.isPending ? "Saving..." : "Save Changes"}
             </Button>
           </DialogFooter>
         </form>
       </DialogContent>
     </Dialog>
   );
 };