import { useState } from "react";
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
import { useDeleteSale } from "@/hooks/useSales";

interface DeleteSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string | null;
  customerName?: string;
}

export const DeleteSaleDialog = ({
  open,
  onOpenChange,
  orderId,
  customerName,
}: DeleteSaleDialogProps) => {
  const deleteSale = useDeleteSale();

  const handleDelete = async () => {
    if (!orderId) return;
    await deleteSale.mutateAsync(orderId);
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Sale</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete order <strong>#{orderId}</strong>
            {customerName && (
              <>
                {" "}
                for <strong>{customerName}</strong>
              </>
            )}
            ? This action cannot be undone. All payment history and items will be
            permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={deleteSale.isPending}
          >
            {deleteSale.isPending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
