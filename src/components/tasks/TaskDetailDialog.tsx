import { useState } from "react";
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
import { Task, useTaskUpdates, useAddTaskUpdate } from "@/hooks/useTasks";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import {
  Clock,
  User,
  MapPin,
  Building,
  Phone,
  MessageSquare,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Timer,
} from "lucide-react";

interface TaskDetailDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userEmails: Record<string, string>;
}

const statusColors: Record<string, string> = {
  Pending: "bg-warning/10 text-warning border-warning/30",
  "In Progress": "bg-info/10 text-info border-info/30",
  Completed: "bg-success/10 text-success border-success/30",
};

const statusIcons: Record<string, React.ElementType> = {
  Pending: AlertTriangle,
  "In Progress": Timer,
  Completed: CheckCircle,
};

export const TaskDetailDialog = ({
  task,
  open,
  onOpenChange,
  userEmails,
}: TaskDetailDialogProps) => {
  const { user } = useAuth();
  const { data: updates = [] } = useTaskUpdates(task?.id || "");
  const addUpdate = useAddTaskUpdate();
  const [remarks, setRemarks] = useState("");
  const [statusChange, setStatusChange] = useState("");

  if (!task) return null;

  const isOverdue =
    task.status !== "Completed" && new Date(task.deadline) < new Date();

  const handleAddUpdate = async () => {
    if (!remarks.trim()) return;
    await addUpdate.mutateAsync({
      taskId: task.id,
      remarks,
      statusChange: statusChange || undefined,
    });
    setRemarks("");
    setStatusChange("");
  };

  const canUpdate =
    user?.id === task.created_by || user?.id === task.assigned_to;

  const StatusIcon = statusIcons[task.status] || AlertTriangle;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <StatusIcon className="h-5 w-5" />
            {task.title}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Status & Deadline */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className={statusColors[task.status] || ""}
            >
              {task.status}
            </Badge>
            {isOverdue && (
              <Badge variant="destructive">Overdue</Badge>
            )}
            <div className="flex items-center gap-1 text-sm text-muted-foreground ml-auto">
              <Clock className="h-4 w-4" />
              <span>
                Deadline: {format(new Date(task.deadline), "dd MMM yyyy, hh:mm a")}
              </span>
            </div>
          </div>

          {/* People */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/30 p-3">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Created By</p>
                <p className="text-sm font-medium">
                  {userEmails[task.created_by] || task.created_by}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              <div>
                <p className="text-xs text-muted-foreground">Assigned To</p>
                <p className="text-sm font-medium">
                  {userEmails[task.assigned_to] || task.assigned_to}
                </p>
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
              Activity Log ({updates.length})
            </p>
            <div className="space-y-3 max-h-60 overflow-y-auto">
              {/* Task creation entry */}
              <div className="flex gap-3 text-sm">
                <div className="w-1 bg-primary rounded-full shrink-0" />
                <div>
                  <p className="text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {userEmails[task.created_by] || "User"}
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
                      update.status_change === "Completed"
                        ? "bg-success"
                        : update.status_change
                        ? "bg-info"
                        : "bg-muted-foreground"
                    }`}
                  />
                  <div>
                    {update.status_change && (
                      <Badge
                        variant="outline"
                        className={`text-xs mb-1 ${
                          statusColors[update.status_change] || ""
                        }`}
                      >
                        Status → {update.status_change}
                      </Badge>
                    )}
                    <p className="text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {userEmails[update.user_id] || "User"}
                      </span>
                      : {update.remarks}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(update.created_at), "dd MMM yyyy, hh:mm a")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Add Update Form */}
          {canUpdate && task.status !== "Completed" && (
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
              <div>
                <Label>Update Status</Label>
                <Select value={statusChange} onValueChange={setStatusChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="No status change" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="no-change">No status change</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleAddUpdate}
                disabled={!remarks.trim() || addUpdate.isPending}
                size="sm"
              >
                {addUpdate.isPending && (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                )}
                Submit Update
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
