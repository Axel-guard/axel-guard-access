import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  CheckCircle,
  XCircle,
  Clock,
  ClipboardList,
} from "lucide-react";
import {
  useBulkQCRequests,
  useApproveBulkQC,
  useRejectBulkQC,
} from "@/hooks/useBulkQCRequests";
import { format } from "date-fns";

const BulkQCApprovalsPage = () => {
  const { data: requests, isLoading } = useBulkQCRequests();
  const approveMutation = useApproveBulkQC();
  const rejectMutation = useRejectBulkQC();

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleApprove = (id: string) => {
    approveMutation.mutate(id);
  };

  const handleRejectClick = (id: string) => {
    setSelectedRequestId(id);
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const handleRejectConfirm = () => {
    if (!selectedRequestId) return;
    rejectMutation.mutate(
      { requestId: selectedRequestId, reason: rejectReason || "No reason provided" },
      { onSuccess: () => setRejectDialogOpen(false) }
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30"><Clock className="h-3 w-3 mr-1" />Pending</Badge>;
      case "Approved":
        return <Badge variant="outline" className="bg-success/10 text-success border-success/30"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case "Rejected":
        return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const pendingCount = requests?.filter((r) => r.status === "Pending").length || 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulk QC Approvals</h1>
        <p className="text-muted-foreground">
          Review and approve/reject bulk QC update requests
        </p>
      </div>

      {pendingCount > 0 && (
        <div className="bg-warning/10 border border-warning/30 rounded-xl p-4 flex items-center gap-3">
          <Clock className="h-5 w-5 text-warning" />
          <span className="font-medium text-warning">{pendingCount} pending request{pendingCount > 1 ? "s" : ""} awaiting approval</span>
        </div>
      )}

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ClipboardList className="h-5 w-5 text-primary" />
            All Requests ({requests?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>QC Value</TableHead>
                  <TableHead>Total Devices</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(!requests || requests.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No bulk QC requests found
                    </TableCell>
                  </TableRow>
                ) : (
                  requests.map((req) => (
                    <TableRow key={req.id}>
                      <TableCell className="font-medium">{req.product_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={
                          req.qc_value === "QC Pass"
                            ? "bg-success/10 text-success border-success/30"
                            : "bg-muted text-muted-foreground"
                        }>
                          {req.qc_value}
                        </Badge>
                      </TableCell>
                      <TableCell>{req.total_devices}</TableCell>
                      <TableCell>{getStatusBadge(req.status)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(req.created_at), "dd MMM yyyy, HH:mm")}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                        {req.rejected_reason || "—"}
                      </TableCell>
                      <TableCell className="text-right">
                        {req.status === "Pending" ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              onClick={() => handleApprove(req.id)}
                              disabled={approveMutation.isPending}
                              className="bg-success hover:bg-success/90 text-white rounded-lg gap-1"
                            >
                              <CheckCircle className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRejectClick(req.id)}
                              disabled={rejectMutation.isPending}
                              className="border-destructive/30 text-destructive hover:bg-destructive/10 rounded-lg gap-1"
                            >
                              <XCircle className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Bulk QC Request</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter reason for rejection..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRejectConfirm}
              disabled={rejectMutation.isPending}
            >
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkQCApprovalsPage;
