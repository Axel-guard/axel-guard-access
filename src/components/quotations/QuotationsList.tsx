import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  MoreVertical,
  Eye,
  FileDown,
  ArrowRightLeft,
  Trash2,
  FileText,
  User,
  Pencil,
  Mail,
  RefreshCw,
} from "lucide-react";
import { format } from "date-fns";
import {
  useQuotations,
  useQuotationWithItems,
  useDeleteQuotation,
  Quotation,
} from "@/hooks/useQuotations";
import { generateQuotationPDF } from "./QuotationPDF";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { QuotationStatusBadge } from "./QuotationStatusBadge";
import { QuotationEmailButton } from "./QuotationEmailButton";
import { ApproveQuotationButton } from "./ApproveQuotationButton";
import { QuotationPreviewDialog } from "./QuotationPreviewDialog";

interface QuotationsListProps {
  onConvertToSale?: (quotationId: string) => void;
  onEditQuotation?: (quotationId: string) => void;
}

export const QuotationsList = ({ onConvertToSale, onEditQuotation }: QuotationsListProps) => {
  const { data: quotations, isLoading } = useQuotations();
  const deleteQuotation = useDeleteQuotation();
  const navigate = useNavigate();
  const { user, isMasterAdmin, isAdmin } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [quotationToDelete, setQuotationToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [previewQuotationId, setPreviewQuotationId] = useState<string | null>(null);

  const { data: selectedQuotation } = useQuotationWithItems(selectedQuotationId);

  const filteredQuotations = quotations?.filter((q) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      q.quotation_no?.toLowerCase().includes(query) ||
      q.customer_name?.toLowerCase().includes(query) ||
      q.company_name?.toLowerCase().includes(query);

    const matchesStatus = statusFilter === "all" || q.status === statusFilter;
    const matchesMy = statusFilter !== "my" || q.created_by === user?.id;

    return matchesSearch && matchesStatus && (statusFilter !== "my" || matchesMy);
  });

  const handleDownloadPDF = async (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setTimeout(async () => {
      if (selectedQuotation) {
        const mappedItems = (selectedQuotation.items || []).map((item: any) => ({
          ...item,
          description: item.description || "",
          unit: item.unit || "Pcs",
        }));
        const quotationWithItems = {
          ...selectedQuotation,
          items: mappedItems,
        } as Quotation;
        const doc = await generateQuotationPDF(quotationWithItems, mappedItems);
        doc.save(`Quotation-${selectedQuotation.quotation_no}.pdf`);
      }
    }, 500);
  };

  const handleConvertClick = (quotationId: string) => {
    if (onConvertToSale) {
      onConvertToSale(quotationId);
    }
  };

  const handleDeleteClick = (quotationId: string) => {
    setQuotationToDelete(quotationId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (quotationToDelete) {
      await deleteQuotation.mutateAsync(quotationToDelete);
      setDeleteDialogOpen(false);
      setQuotationToDelete(null);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileText className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Quotations</h2>
          <p className="text-sm text-muted-foreground">
            {filteredQuotations?.length || 0} quotations
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by Quotation No, Customer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {["all", "Pending Approval", "Approved", "Sent", "Rejected", "Converted"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "All" : status}
            </Button>
          ))}
          <Button
            size="sm"
            variant={statusFilter === "my" ? "default" : "outline"}
            onClick={() => setStatusFilter("my")}
          >
            <User className="mr-1 h-3 w-3" />
            My Quotations
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Quotation No</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead className="text-right">Grand Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredQuotations?.map((quotation) => (
                  <TableRow key={quotation.id}>
                    <TableCell className="font-semibold text-primary">
                      {quotation.quotation_no}
                    </TableCell>
                    <TableCell>
                      {format(new Date(quotation.quotation_date), "dd/MM/yyyy")}
                    </TableCell>
                    <TableCell>{quotation.customer_name}</TableCell>
                    <TableCell>{quotation.company_name || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      ₹{Number(quotation.grand_total).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      <QuotationStatusBadge status={quotation.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {/* Approve Button */}
                        <ApproveQuotationButton
                          quotationId={quotation.id}
                          quotationNo={quotation.quotation_no}
                          status={quotation.status}
                          createdBy={quotation.created_by}
                          customerName={quotation.customer_name}
                          grandTotal={Number(quotation.grand_total)}
                        />
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* View Quotation */}
                            <DropdownMenuItem
                              onClick={() => setPreviewQuotationId(quotation.id)}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              View Quotation
                            </DropdownMenuItem>

                            {quotation.status !== "Converted" && onEditQuotation && (
                              <DropdownMenuItem
                                onClick={() => onEditQuotation(quotation.id)}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Quotation
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => handleDownloadPDF(quotation.id)}
                            >
                              <FileDown className="mr-2 h-4 w-4" />
                              Download PDF
                            </DropdownMenuItem>

                            {/* Resend Email - for Approved or Sent */}
                            {(quotation.status === "Approved" || quotation.status === "Sent") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <ResendEmailMenuItem quotationId={quotation.id} quotationNo={quotation.quotation_no} />
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            {/* Convert to Sale */}
                            {(quotation.status === "Approved" || quotation.status === "Sent") && onConvertToSale && (
                              <DropdownMenuItem
                                onClick={() => handleConvertClick(quotation.id)}
                              >
                                <ArrowRightLeft className="mr-2 h-4 w-4" />
                                Convert to Sale
                              </DropdownMenuItem>
                            )}
                            {quotation.status === "Converted" && (
                              <DropdownMenuItem
                                onClick={() => navigate("/sales")}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Sale (#{quotation.converted_order_id})
                              </DropdownMenuItem>
                            )}
                            {(isMasterAdmin || isAdmin) && quotation.status !== "Converted" && (
                              <DropdownMenuItem
                                onClick={() => handleDeleteClick(quotation.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredQuotations || filteredQuotations.length === 0) && (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="py-8 text-center text-muted-foreground"
                    >
                      No quotations found. Create your first quotation.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Quotation Preview Dialog */}
      <QuotationPreviewDialog
        quotationId={previewQuotationId}
        onClose={() => setPreviewQuotationId(null)}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Quotation?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The quotation will be permanently
              deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

// Resend Email menu item component
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import React from "react";

const ResendEmailMenuItem = React.forwardRef<
  HTMLDivElement,
  { quotationId: string; quotationNo: string }
>(({ quotationId, quotationNo, ...props }, ref) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const resendMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.functions.invoke("send-email", {
        body: { type: "quotation", quotationId },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-logs", quotationId] });
      toast({ title: "Email Resent", description: `Quotation #${quotationNo} email resent successfully.` });
    },
    onError: (error: any) => {
      toast({ title: "Failed to Resend Email", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div
      ref={ref}
      {...props}
      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
      onClick={() => resendMutation.mutate()}
    >
      <RefreshCw className="mr-2 h-4 w-4" />
      {resendMutation.isPending ? "Sending..." : "Resend Email"}
    </div>
  );
});
ResendEmailMenuItem.displayName = "ResendEmailMenuItem";
