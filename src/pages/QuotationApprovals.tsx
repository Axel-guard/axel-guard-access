import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  MoreVertical,
  Eye,
  Check,
  X,
  FileDown,
  Clock,
  Shield,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { createNotification } from "@/hooks/useNotifications";

const QuotationApprovalsPage = () => {
  const { user, isMasterAdmin, isAdmin } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("Pending Approval");

  // Fetch pending quotations
  const { data: quotations, isLoading } = useQuery({
    queryKey: ["quotation-approvals", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("quotations")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  // Fetch quotation items
  const { data: quotationItems } = useQuery({
    queryKey: ["quotation-items", selectedQuotation?.id],
    queryFn: async () => {
      if (!selectedQuotation?.id) return [];
      const { data, error } = await supabase
        .from("quotation_items")
        .select("*")
        .eq("quotation_id", selectedQuotation.id);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuotation?.id,
  });

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: async (quotationId: string) => {
      const { data: quotation, error: fetchError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotationId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("quotations")
        .update({
          status: "Approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", quotationId);

      if (error) throw error;

      // Get customer email for notification
      let customerEmail = null;
      if (quotation.customer_code) {
        const { data: lead } = await supabase
          .from("leads")
          .select("email")
          .eq("customer_code", quotation.customer_code)
          .single();
        customerEmail = lead?.email;
      }

      // Send quotation email automatically
      if (customerEmail) {
        try {
          await supabase.functions.invoke("send-email", {
            body: {
              type: "quotation",
              quotationId,
            },
          });

          // Log email
          await supabase.from("email_logs").insert({
            quotation_id: quotationId,
            sent_by: user?.id,
            status: "Sent",
            recipient_email: customerEmail,
          });
        } catch (emailError) {
          console.error("Failed to send quotation email:", emailError);
        }
      }

      // Notify creator
      createNotification(
        "Quotation Approved",
        `Quotation ${quotation.quotation_no} for ${quotation.customer_name} has been approved.`,
        "quotation",
        {
          quotation_id: quotationId,
          quotation_no: quotation.quotation_no,
          customer_name: quotation.customer_name,
          event: "quotation_approved",
        }
      );

      return quotation;
    },
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ["quotation-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({
        title: "Quotation Approved",
        description: `Quotation #${quotation.quotation_no} has been approved and email sent.`,
      });
      setViewDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to approve quotation",
        variant: "destructive",
      });
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: async ({ quotationId, reason }: { quotationId: string; reason: string }) => {
      const { data: quotation, error: fetchError } = await supabase
        .from("quotations")
        .select("*")
        .eq("id", quotationId)
        .single();

      if (fetchError) throw fetchError;

      const { error } = await supabase
        .from("quotations")
        .update({
          status: "Rejected",
          rejected_reason: reason,
        })
        .eq("id", quotationId);

      if (error) throw error;

      // Notify creator
      createNotification(
        "Quotation Rejected",
        `Quotation #${quotation.quotation_no} has been rejected. Reason: ${reason}`,
        "quotation",
        {
          quotation_id: quotationId,
          quotation_no: quotation.quotation_no,
          event: "quotation_rejected",
          reason,
        }
      );

      return quotation;
    },
    onSuccess: (quotation) => {
      queryClient.invalidateQueries({ queryKey: ["quotation-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["quotations"] });
      toast({
        title: "Quotation Rejected",
        description: `Quotation #${quotation.quotation_no} has been rejected.`,
      });
      setRejectDialogOpen(false);
      setRejectReason("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reject quotation",
        variant: "destructive",
      });
    },
  });

  const filteredQuotations = quotations?.filter((q) => {
    const query = searchQuery.toLowerCase();
    return (
      q.quotation_no?.toLowerCase().includes(query) ||
      q.customer_name?.toLowerCase().includes(query) ||
      q.company_name?.toLowerCase().includes(query)
    );
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending Approval":
        return (
          <Badge className="bg-warning/10 text-warning border-warning/20">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case "Approved":
        return (
          <Badge className="bg-success/10 text-success border-success/20">
            <Check className="mr-1 h-3 w-3" />
            Approved
          </Badge>
        );
      case "Rejected":
        return (
          <Badge className="bg-destructive/10 text-destructive border-destructive/20">
            <X className="mr-1 h-3 w-3" />
            Rejected
          </Badge>
        );
      default:
        return <Badge className="bg-muted text-muted-foreground">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <FileCheck className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Quotation Approvals</h1>
          <p className="text-sm text-muted-foreground">
            {isMasterAdmin ? "Review and approve quotations" : "View pending quotations"}
          </p>
        </div>
        {isMasterAdmin && (
          <Badge className="ml-auto bg-primary/10 text-primary">
            <Shield className="mr-1 h-3 w-3" />
            Master Admin
          </Badge>
        )}
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
        <div className="flex gap-2">
          {["Pending Approval", "Approved", "Rejected", "all"].map((status) => (
            <Button
              key={status}
              size="sm"
              variant={statusFilter === status ? "default" : "outline"}
              onClick={() => setStatusFilter(status)}
            >
              {status === "all" ? "All" : status}
            </Button>
          ))}
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
                  <TableHead className="text-right">Amount</TableHead>
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
                    <TableCell>{getStatusBadge(quotation.status)}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedQuotation(quotation);
                              setViewDialogOpen(true);
                            }}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {isMasterAdmin && quotation.status === "Pending Approval" && (
                            <>
                              <DropdownMenuItem
                                onClick={() => approveMutation.mutate(quotation.id)}
                                className="text-success"
                              >
                                <Check className="mr-2 h-4 w-4" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedQuotation(quotation);
                                  setRejectDialogOpen(true);
                                }}
                                className="text-destructive"
                              >
                                <X className="mr-2 h-4 w-4" />
                                Reject
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {(!filteredQuotations || filteredQuotations.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                      No quotations found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* View Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Quotation Details</DialogTitle>
            <DialogDescription>
              Review quotation #{selectedQuotation?.quotation_no}
            </DialogDescription>
          </DialogHeader>

          {selectedQuotation && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-sm text-muted-foreground">Customer Name</p>
                  <p className="font-medium">{selectedQuotation.customer_name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Company</p>
                  <p className="font-medium">{selectedQuotation.company_name || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Mobile</p>
                  <p className="font-medium">{selectedQuotation.mobile || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">GST Number</p>
                  <p className="font-medium">{selectedQuotation.gst_number || "-"}</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">Products</p>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {quotationItems?.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.product_name}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">
                            ₹{Number(item.unit_price).toLocaleString("en-IN")}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            ₹{Number(item.amount).toLocaleString("en-IN")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="rounded-lg bg-muted/50 p-4">
                <div className="grid gap-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>₹{Number(selectedQuotation.subtotal).toLocaleString("en-IN")}</span>
                  </div>
                  {selectedQuotation.courier_charge > 0 && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Courier</span>
                      <span>₹{Number(selectedQuotation.courier_charge).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  {selectedQuotation.apply_gst && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">GST (18%)</span>
                      <span>₹{Number(selectedQuotation.gst_amount).toLocaleString("en-IN")}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-2 font-bold">
                    <span>Grand Total</span>
                    <span className="text-primary">
                      ₹{Number(selectedQuotation.grand_total).toLocaleString("en-IN")}
                    </span>
                  </div>
                </div>
              </div>

              {selectedQuotation.rejected_reason && (
                <div className="rounded-lg bg-destructive/10 p-4 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">Rejection Reason</span>
                  </div>
                  <p className="text-sm">{selectedQuotation.rejected_reason}</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isMasterAdmin && selectedQuotation?.status === "Pending Approval" && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewDialogOpen(false);
                    setRejectDialogOpen(true);
                  }}
                  className="text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
                <Button
                  onClick={() => approveMutation.mutate(selectedQuotation.id)}
                  disabled={approveMutation.isPending}
                  className="bg-success hover:bg-success/90"
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve & Send Email
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Quotation</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this quotation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (selectedQuotation && rejectReason.trim()) {
                  rejectMutation.mutate({
                    quotationId: selectedQuotation.id,
                    reason: rejectReason,
                  });
                }
              }}
              disabled={!rejectReason.trim() || rejectMutation.isPending}
            >
              <X className="mr-2 h-4 w-4" />
              Reject Quotation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuotationApprovalsPage;