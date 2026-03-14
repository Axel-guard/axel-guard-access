import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Task, useTaskUpdates, useAddTaskUpdate, uploadTaskAttachment } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { format, differenceInDays } from "date-fns";
import { toast } from "sonner";
import {
  Clock,
  User,
  MapPin,
  Building,
  Phone,
  MessageSquare,
  Loader2,
  CheckCircle,
  Paperclip,
  Download,
  FileText,
  Flag,
  Mail,
  ShieldCheck,
  XCircle,
} from "lucide-react";

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmails: Record<string, string>;
  userNames?: Record<string, string>;
}

const statusColors: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/30",
  "In Progress": "bg-info/10 text-info border-info/30",
  "Waiting for Customer": "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400",
  "Pending Master Approval": "bg-purple-100 text-purple-700 border-purple-300 dark:bg-purple-900/20 dark:text-purple-400",
  Completed: "bg-success/10 text-success border-success/30",
  Closed: "bg-muted text-muted-foreground border-muted",
};

const priorityColors: Record<string, string> = {
  Low: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/20 dark:text-emerald-400",
  Normal: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/20 dark:text-blue-400",
  High: "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400",
  Urgent: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400",
};

function getTaskAgeDays(createdAt: string): number {
  return differenceInDays(new Date(), new Date(createdAt));
}

function getAgeBadgeClass(days: number): string {
  if (days <= 2) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
  if (days <= 5) return "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400";
  return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
}

export const TaskDetailDialog = ({
  task,
  open,
  onOpenChange,
  userEmails,
  userNames,
}: TaskDetailDialogProps) => {
  const { user, isMasterAdmin } = useAuth();
  const { data: updates = [] } = useTaskUpdates(task?.id || "");
  const addUpdate = useAddTaskUpdate();
  const [remarks, setRemarks] = useState("");
  const [statusChange, setStatusChange] = useState("");
  const [attachment, setAttachment] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rejectionRemarks, setRejectionRemarks] = useState("");
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!task) return null;

  const taskAge = getTaskAgeDays(task.created_at);

  const getDisplayName = (userId: string) => {
    if (userNames?.[userId]) return userNames[userId];
    return userEmails[userId] || userId;
  };

  const handleAddUpdate = async () => {
    if (!remarks.trim()) return;
    
    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;

    if (attachment) {
      setUploading(true);
      try {
        const result = await uploadTaskAttachment(attachment);
        attachmentUrl = result.url;
        attachmentName = result.name;
      } catch {
        // Continue without attachment
      }
      setUploading(false);
    }

    await addUpdate.mutateAsync({
      taskId: task.id,
      remarks,
      statusChange: statusChange && statusChange !== "no-change" ? statusChange : undefined,
      attachmentUrl,
      attachmentName,
    });
    setRemarks("");
    setStatusChange("");
    setAttachment(null);
  };

  const handleMarkCompleted = async () => {
    if (!remarks.trim()) {
      toast.error("Please add remarks before marking as completed");
      return;
    }
    await addUpdate.mutateAsync({
      taskId: task.id,
      remarks,
      statusChange: "Pending Master Approval",
    });
    setRemarks("");
    setStatusChange("");
    toast.success("Task submitted for Master Admin approval");
  };

  const handleApprove = async () => {
    setApproving(true);
    try {
      // Add approval update
      await addUpdate.mutateAsync({
        taskId: task.id,
        remarks: "Task closure approved by Master Admin.",
        statusChange: "Closed",
      });

      // Send closure email via edge function
      try {
        await supabase.functions.invoke("send-task-email", {
          body: { type: "closure-approved", taskId: task.id },
        });
      } catch (e) {
        console.error("Failed to send closure email:", e);
      }

      toast.success("Task approved and closed successfully");
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionRemarks.trim()) {
      toast.error("Please provide a reason for rejection");
      return;
    }
    setRejecting(true);
    try {
      await addUpdate.mutateAsync({
        taskId: task.id,
        remarks: `Closure rejected by Master Admin: ${rejectionRemarks}`,
        statusChange: "In Progress",
        internalOnly: true,
      });
      setRejectionRemarks("");
      setShowRejectForm(false);
      toast.success("Task closure rejected. Task moved back to In Progress.");
    } finally {
      setRejecting(false);
    }
  };

  const canUpdate =
    user?.id === task.created_by || user?.id === task.assigned_to;

  const isTerminal = task.status === "Closed";
  const isPendingApproval = task.status === "Pending Master Approval";
  const canMarkCompleted = canUpdate && !isTerminal && !isPendingApproval && task.status !== "Completed";

  // Available statuses for the update dropdown (exclude terminal states and approval)
  const availableStatuses = ["In Progress", "Waiting for Customer"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status, Priority & Task Age */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={statusColors[task.status] || ""}>
              {task.status === "Pending Master Approval" ? "⏳ Pending Approval" : task.status}
            </Badge>
            <Badge variant="outline" className={priorityColors[task.priority] || ""}>
              <Flag className="h-3 w-3 mr-1" />
              {task.priority}
            </Badge>
            <Badge variant="outline" className={getAgeBadgeClass(taskAge)}>
              <Clock className="h-3 w-3 mr-1" />
              {taskAge === 0 ? "Today" : `${taskAge} Day${taskAge > 1 ? "s" : ""} Old`}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {task.task_type === "Customer" ? "👤 Customer Task" : "🏢 Internal Task"}
            </Badge>
            {task.customer_email_enabled && (
              <Badge variant="outline" className="bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                <Mail className="h-3 w-3 mr-1" />
                Customer Email ON
              </Badge>
            )}
          </div>

          {/* Master Admin Approval Section */}
          {isPendingApproval && isMasterAdmin && (
            <div className="rounded-lg border-2 border-purple-300 dark:border-purple-700 bg-purple-50 dark:bg-purple-900/10 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <p className="font-semibold text-purple-700 dark:text-purple-400">Master Admin Approval Required</p>
              </div>
              <p className="text-sm text-muted-foreground">
                This task has been marked as completed and requires your approval to close.
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={handleApprove}
                  disabled={approving || rejecting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {approving && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Approve Closure
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setShowRejectForm(!showRejectForm)}
                  disabled={approving || rejecting}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
              </div>
              {showRejectForm && (
                <div className="space-y-2 pt-2 border-t border-purple-200 dark:border-purple-800">
                  <Label>Rejection Reason *</Label>
                  <Textarea
                    value={rejectionRemarks}
                    onChange={(e) => setRejectionRemarks(e.target.value)}
                    placeholder="Explain why the task cannot be closed yet..."
                    rows={2}
                  />
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleReject}
                    disabled={!rejectionRemarks.trim() || rejecting}
                  >
                    {rejecting && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
                    Confirm Rejection
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* People */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="text-sm font-medium">{getDisplayName(task.created_by)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm font-medium">{getDisplayName(task.assigned_to)}</p>
              </div>
            </div>
          </div>

          {/* Customer Details */}
          {task.customer_code && (
            <div className="rounded-lg border border-border p-3 space-y-2">
              <p className="text-sm font-semibold text-foreground">
                Customer: {task.customer_code}
              </p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {task.customer_name && (
                  <div className="flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.customer_name}
                  </div>
                )}
                {task.customer_phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.customer_phone}
                  </div>
                )}
                {task.customer_location && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.customer_location}
                  </div>
                )}
                {task.company_name && (
                  <div className="flex items-center gap-1.5">
                    <Building className="h-3.5 w-3.5 text-muted-foreground" />
                    {task.company_name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Description */}
          {task.description && (
            <div>
              <p className="text-sm font-semibold mb-1">Description</p>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {task.description}
              </p>
            </div>
          )}

          {/* Activity Timeline */}
          <div>
            <p className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4" />
              Activity Log ({updates.length + 1})
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {/* Task creation entry */}
              <div className="flex gap-3 text-sm">
                <div className="w-1 bg-primary rounded-full shrink-0" />
                <div>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {getDisplayName(task.created_by)}
                    </span>{" "}
                    created this task
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(task.created_at), "dd MMM yyyy, hh:mm a")}
                  </p>
                </div>
              </div>

              {updates.map((update) => (
                <div key={update.id} className="flex gap-3 text-sm">
                  <div
                    className={`w-1 rounded-full shrink-0 ${
                      update.status_change === "Closed"
                        ? "bg-success"
                        : update.status_change === "Pending Master Approval"
                        ? "bg-purple-500"
                        : update.status_change
                        ? "bg-info"
                        : update.attachment_url
                        ? "bg-purple-500"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div className="flex-1">
                    {update.status_change && (
                      <Badge
                        variant="outline"
                        className={`text-xs mb-1 ${statusColors[update.status_change] || ""}`}
                      >
                        Status → {update.status_change === "Pending Master Approval" ? "Pending Approval" : update.status_change}
                      </Badge>
                    )}
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {getDisplayName(update.user_id)}
                      </span>
                      : {update.remarks}
                    </p>
                    {update.attachment_url && (
                      <a
                        href={update.attachment_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
                      >
                        <FileText className="h-3 w-3" />
                        {update.attachment_name || "Attachment"}
                        <Download className="h-3 w-3" />
                      </a>
                    )}
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(update.created_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Update Form */}
          {canUpdate && !isTerminal && !isPendingApproval && (
            <div className="border-t pt-4 space-y-3">
              <p className="text-sm font-semibold">Add Update</p>
              <div>
                <Label>Remarks *</Label>
                <Textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Describe work done or progress..."
                  rows={2}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Update Status</Label>
                  <Select value={statusChange} onValueChange={setStatusChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="No status change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-change">No status change</SelectItem>
                      {availableStatuses.map((s) => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Attach File</Label>
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.mov,.doc,.docx,.xls,.xlsx"
                    onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                  />
                  <Button
                    variant="outline"
                    className="w-full mt-0.5"
                    onClick={() => fileRef.current?.click()}
                    type="button"
                  >
                    <Paperclip className="h-4 w-4 mr-1" />
                    {attachment ? attachment.name.substring(0, 20) : "Choose file"}
                  </Button>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleAddUpdate}
                  disabled={!remarks.trim() || addUpdate.isPending || uploading}
                  size="sm"
                >
                  {(addUpdate.isPending || uploading) && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  )}
                  Submit Update
                </Button>
                {canMarkCompleted && (
                  <Button
                    onClick={handleMarkCompleted}
                    disabled={!remarks.trim() || addUpdate.isPending || uploading}
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Mark as Completed
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
