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
import { Renewal, useDeleteRenewal } from "@/hooks/useRenewals";

interface DeleteRenewalDialogProps {
  renewal: Renewal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const DeleteRenewalDialog = ({ renewal, open, onOpenChange }: DeleteRenewalDialogProps) => {
  const deleteMutation = useDeleteRenewal();

  const handleDelete = async () => {
    if (!renewal?.id) return;
    await deleteMutation.mutateAsync(renewal.id);
    onOpenChange(false);
  };

  if (!renewal) return null;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Renewal</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete the renewal for order "{renewal.order_id}" ({renewal.product_name || renewal.product_type})?
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteMutation.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
