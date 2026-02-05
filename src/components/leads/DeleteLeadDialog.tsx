 import {
   AlertDialog,
   AlertDialogAction,
   AlertDialogCancel,
   AlertDialogContent,
   AlertDialogDescription,
   AlertDialogFooter,
   AlertDialogHeader,
   AlertDialogTitle,
 } from "@/components/ui/alert-dialog";
 import { Lead, useDeleteLead } from "@/hooks/useLeads";
 
 interface DeleteLeadDialogProps {
   lead: Lead | null;
   open: boolean;
   onOpenChange: (open: boolean) => void;
 }
 
 export const DeleteLeadDialog = ({ lead, open, onOpenChange }: DeleteLeadDialogProps) => {
   const deleteLead = useDeleteLead();
 
   const handleDelete = async () => {
     if (!lead?.id) return;
     await deleteLead.mutateAsync(lead.id);
     onOpenChange(false);
   };
 
   if (!lead) return null;
 
   return (
     <AlertDialog open={open} onOpenChange={onOpenChange}>
       <AlertDialogContent>
         <AlertDialogHeader>
           <AlertDialogTitle>Delete Lead</AlertDialogTitle>
           <AlertDialogDescription>
             Are you sure you want to delete the lead "{lead.customer_name}" ({lead.customer_code})?
             This action cannot be undone.
           </AlertDialogDescription>
         </AlertDialogHeader>
         <AlertDialogFooter>
           <AlertDialogCancel>Cancel</AlertDialogCancel>
           <AlertDialogAction
             onClick={handleDelete}
             className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
           >
             {deleteLead.isPending ? "Deleting..." : "Delete"}
           </AlertDialogAction>
         </AlertDialogFooter>
       </AlertDialogContent>
     </AlertDialog>
   );
 };