import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
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
import { CheckCircle, Loader2 } from "lucide-react";
import { createNotification } from "@/hooks/useNotifications";

interface ApproveQuotationButtonProps {
  quotationId: string;
  quotationNo: string;
  status: string;
  createdBy?: string | null;
  customerName: string;
  grandTotal: number;
}

export const ApproveQuotationButton = ({
  quotationId,
  quotationNo,
  status,
  createdBy,
  customerName,
  grandTotal,
}: ApproveQuotationButtonProps) => {
  const { user, isMasterAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const approveMutation = useMutation({
    mutationFn: async () => {
      // 1. Update quotation status to Approved
      const { error: updateError } = await supabase
        .from("quotations")
        .update({
          status: "Approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", quotationId);

      if (updateError) throw updateError;

      // 2. Auto-send email to customer
      const { error: emailError } = await supabase.functions.invoke("send-email", {
        body: {
          type: "quotation",
          quotationId,
        },
      });

      if (emailError) {
        console.error("Email send error:", emailError);
        // Log failed email but don't block approval
        await supabase.from("email_logs").insert({
          quotation_id: quotationId,
          sent_by: user?.id,
          status: "Failed",
          error_message: emailError.message,
        });
      } else {
        // Log successful email
        const { data: quotation } = await supabase
          .from("quotations")
          .select("customer_code")
          .eq("id", quotationId)
          .single();

        let recipientEmail = null;
        if (quotation?.customer_code) {
          const { data: lead } = await supabase
            .from("leads")
            .select("email")
            .eq("customer_code", quotation.customer_code)
            .single();
          recipientEmail = lead?.email;
        }

        await supabase.from("email_logs").insert({
          quotation_id: quotationId,
          sent_by: user?.id,
          status: "Sent",
          recipient_email: recipientEmail,
        });

        // Update quotation status to Sent after email
        await supabase
          .from("quotations")
          .update({ status: "Sent" })
          .eq("id", quotationId);
      }

      return { quotationNo, customerName, grandTotal, createdBy };
    },
    onSuccess: async (data) => {
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      queryClient.invalidateQueries({ queryKey: ["email-logs", quotationId] });

      // Send notification to creator and admins
      await createNotification(
        "Quotation Approved",
        `Quotation ${data.quotationNo} for ${data.customerName} has been approved.`,
        "quotation",
        {
          quotation_id: quotationId,
          quotation_no: data.quotationNo,
          customer_name: data.customerName,
          total_amount: data.grandTotal,
          event: "quotation_approved",
        },
        "/quotations",
        data.quotationNo
      );

      toast({
        title: "Quotation Approved",
        description: `Quotation #${quotationNo} approved. Email sent to customer.`,
      });

      setConfirmDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message || "Could not approve quotation.",
        variant: "destructive",
      });
    },
  });

  // Only show for Master Admin and only for Pending Approval status
  if (!isMasterAdmin || status !== "Pending Approval") {
    return null;
  }

  return (
    <>
      <Button
        size="sm"
        variant="default"
        className="bg-success hover:bg-success/90 text-white"
        onClick={() => setConfirmDialogOpen(true)}
        disabled={approveMutation.isPending}
      >
        {approveMutation.isPending ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <CheckCircle className="mr-2 h-4 w-4" />
        )}
        Approve
      </Button>

      <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this quotation?
              <br />
              <br />
              <strong>Quotation:</strong> {quotationNo}
              <br />
              <strong>Customer:</strong> {customerName}
              <br />
              <strong>Total:</strong> ₹{grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              <br />
              <br />
              After approval, the quotation email will be automatically sent to the customer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={approveMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => approveMutation.mutate()}
              disabled={approveMutation.isPending}
              className="bg-success hover:bg-success/90"
            >
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                "Yes, Approve"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
