import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Mail, MailCheck, RefreshCw, AlertCircle, Clock, Loader2 } from "lucide-react";
import { format } from "date-fns";

interface QuotationEmailButtonProps {
  quotationId: string;
  quotationNo: string;
  status: string;
  onEmailSent?: () => void;
}

export const QuotationEmailButton = ({
  quotationId,
  quotationNo,
  status,
  onEmailSent,
}: QuotationEmailButtonProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingDialogOpen, setPendingDialogOpen] = useState(false);

  // Fetch email logs for this quotation
  const { data: emailLogs } = useQuery({
    queryKey: ["email-logs", quotationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_logs")
        .select("*")
        .eq("quotation_id", quotationId)
        .order("sent_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("send-email", {
        body: {
          type: "quotation",
          quotationId,
        },
      });

      if (error) throw error;

      // Get quotation to find customer email
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

      // Log email
      await supabase.from("email_logs").insert({
        quotation_id: quotationId,
        sent_by: user?.id,
        status: "Sent",
        recipient_email: recipientEmail,
      });

      // Update status to Sent if it was Approved
      if (status === "Approved") {
        await supabase
          .from("quotations")
          .update({ status: "Sent" })
          .eq("id", quotationId);
      }

      return recipientEmail;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs", quotationId] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({
        title: "Email Sent",
        description: `Quotation #${quotationNo} email sent successfully.`,
      });
      onEmailSent?.();
    },
    onError: (error: any) => {
      // Log failed email
      supabase.from("email_logs").insert({
        quotation_id: quotationId,
        sent_by: user?.id,
        status: "Failed",
        error_message: error.message,
      });

      toast({
        title: "Failed to Send Email",
        description: error.message || "Could not send quotation email.",
        variant: "destructive",
      });
    },
  });

  const handleClick = () => {
    if (status === "Pending Approval") {
      setPendingDialogOpen(true);
    } else if (status === "Approved" || status === "Sent") {
      sendEmailMutation.mutate();
    }
  };

  const hasBeenSent = emailLogs && emailLogs.length > 0;
  const lastSent = emailLogs?.[0];
  const isDisabled = status === "Rejected" || status === "Converted" || status === "Draft";

  if (isDisabled) {
    return null;
  }

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={status === "Pending Approval" ? "outline" : "default"}
            size="sm"
            onClick={handleClick}
            disabled={sendEmailMutation.isPending || status === "Pending Approval"}
            className={status === "Pending Approval" ? "opacity-50 cursor-not-allowed" : ""}
          >
            {sendEmailMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : hasBeenSent ? (
              <RefreshCw className="mr-2 h-4 w-4" />
            ) : (
              <Mail className="mr-2 h-4 w-4" />
            )}
            {hasBeenSent ? "Resend Email" : "Send Email"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {status === "Pending Approval" ? (
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Awaiting Master Admin approval</span>
            </div>
          ) : lastSent ? (
            <div className="text-sm">
              <p>Last sent: {format(new Date(lastSent.sent_at), "dd/MM/yyyy HH:mm")}</p>
              <p>To: {lastSent.recipient_email}</p>
            </div>
          ) : (
            <span>Send quotation to customer</span>
          )}
        </TooltipContent>
      </Tooltip>

      {/* Pending Approval Dialog */}
      <Dialog open={pendingDialogOpen} onOpenChange={setPendingDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              Approval Required
            </DialogTitle>
            <DialogDescription>
              This quotation is not approved yet. Email can only be sent after Master Admin
              approval.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg bg-warning/10 p-4 border border-warning/20">
            <p className="text-sm">
              Quotation #{quotationNo} is currently pending approval. Please wait for a
              Master Admin to review and approve this quotation before sending it to the
              customer.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPendingDialogOpen(false)}>
              Understood
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};