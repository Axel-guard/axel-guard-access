import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask, uploadTaskAttachment } from "@/hooks/useTasks";
import { CheckCircle, AlertCircle, Loader2, Paperclip, X } from "lucide-react";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface Employee {
  id: string;
  name: string;
  employee_role: string | null;
}

interface AllowedUser {
  userId: string;
  email: string;
  name: string;
  role: string;
}

export const AddTaskDialog = ({ open, onOpenChange }: AddTaskDialogProps) => {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerEmailEnabled, setCustomerEmailEnabled] = useState(false);
  const [description, setDescription] = useState("");
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [attachment, setAttachment] = useState<File | null>(null);

  // Fetch users for assignment - use DB function for proper user_id↔email mapping
  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      // Get user_id → email mapping via security definer function
      const { data: userMap } = await supabase.rpc("get_user_email_map");

      // Get employees for display names
      const { data: employees } = await supabase
        .from("employees")
        .select("name, email, employee_role")
        .eq("is_active", true);

      // Get allowed emails with roles
      const { data: allowedEmails } = await supabase
        .from("allowed_emails")
        .select("email, role");

      if (!userMap || !allowedEmails) return;

      const userList: AllowedUser[] = [];
      for (const um of userMap) {
        // Find role from allowed_emails
        const ae = allowedEmails.find(
          a => a.email.toLowerCase() === um.email.toLowerCase()
        );

        // Find employee name by email match
        const emp = employees?.find(
          e => e.email?.toLowerCase() === um.email.toLowerCase()
        );

        const displayName = emp?.name || um.email.split("@")[0];
        const roleLabel = ae?.role === "master_admin" ? "Master Admin" 
          : ae?.role === "admin" ? "Admin" : "User";
        const displayRole = emp?.employee_role || roleLabel;

        userList.push({
          userId: um.user_id,
          email: um.email,
          name: displayName,
          role: displayRole,
        });
      }

      setUsers(userList);
    };
    fetchUsers();
  }, [open]);

  // Customer code lookup with debounce
  useEffect(() => {
    if (!customerCode.trim()) {
      setCustomerFound(null);
      setCustomerName("");
      setCustomerPhone("");
      setCustomerLocation("");
      setCompanyName("");
      setCustomerEmail("");
      return;
    }

    const timer = setTimeout(async () => {
      setLookingUp(true);
      const { data } = await supabase
        .from("leads")
        .select("customer_name, mobile_number, location, company_name, email")
        .eq("customer_code", customerCode.trim())
        .maybeSingle();

      if (data) {
        setCustomerFound(true);
        setCustomerName(data.customer_name || "");
        setCustomerPhone(data.mobile_number || "");
        setCustomerLocation(data.location || "");
        setCompanyName(data.company_name || "");
        setCustomerEmail(data.email || "");
      } else {
        setCustomerFound(false);
      }
      setLookingUp(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [customerCode]);

  const isCustomerTask = !!customerCode.trim() && customerFound;

  const handleSubmit = async () => {
    if (!title || !assignedTo) return;

    let attachmentUrl: string | undefined;
    let attachmentName: string | undefined;

    if (attachment) {
      try {
        const result = await uploadTaskAttachment(attachment);
        attachmentUrl = result.url;
        attachmentName = result.name;
      } catch {
        // Continue without attachment
      }
    }

    await createTask.mutateAsync({
      title,
      description: description || undefined,
      customer_code: customerCode || undefined,
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      customer_location: customerLocation || undefined,
      company_name: companyName || undefined,
      customer_email: customerEmail || undefined,
      priority,
      task_type: isCustomerTask ? "Customer" : "Internal",
      customer_email_enabled: isCustomerTask ? customerEmailEnabled : false,
      assigned_to: assignedTo,
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTitle("");
    setAssignedTo("");
    setPriority("Normal");
    setCustomerCode("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLocation("");
    setCompanyName("");
    setCustomerEmail("");
    setCustomerEmailEnabled(false);
    setDescription("");
    setCustomerFound(null);
    setAttachment(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Task Title */}
          <div>
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
            />
          </div>

          {/* Assign To - Employee Names */}
          <div>
            <Label htmlFor="assign-to">Assign To *</Label>
            <Select value={assignedTo} onValueChange={setAssignedTo}>
              <SelectTrigger>
                <SelectValue placeholder="Select team member" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.userId} value={u.userId}>
                    {u.name} – {u.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority */}
          <div>
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Low">🟢 Low</SelectItem>
                <SelectItem value="Normal">🔵 Normal</SelectItem>
                <SelectItem value="High">🟠 High</SelectItem>
                <SelectItem value="Urgent">🔴 Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Customer Code (Optional) */}
          <div>
            <Label htmlFor="customer-code">Customer Code (Optional)</Label>
            <div className="relative">
              <Input
                id="customer-code"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                placeholder="Enter customer code"
                className={
                  customerFound === true
                    ? "border-success pr-8"
                    : customerFound === false
                    ? "border-destructive pr-8"
                    : ""
                }
              />
              {lookingUp && (
                <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
              {!lookingUp && customerFound === true && (
                <CheckCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-success" />
              )}
              {!lookingUp && customerFound === false && (
                <AlertCircle className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-destructive" />
              )}
            </div>
          </div>

          {customerFound && (
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
              <div>
                <p className="text-xs text-muted-foreground">Customer Name</p>
                <p className="text-sm font-medium">{customerName || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Phone</p>
                <p className="text-sm font-medium">{customerPhone || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Location</p>
                <p className="text-sm font-medium">{customerLocation || "—"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Company</p>
                <p className="text-sm font-medium">{companyName || "—"}</p>
              </div>
            </div>
          )}

          {/* Customer Email Communication Toggle - only for customer tasks */}
          {isCustomerTask && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enable Customer Email Communication</p>
                <p className="text-xs text-muted-foreground">
                  Send task updates to customer via email
                </p>
              </div>
              <Switch
                checked={customerEmailEnabled}
                onCheckedChange={setCustomerEmailEnabled}
              />
            </div>
          )}

          {/* Description */}
          <div>
            <Label htmlFor="task-desc">Description / Remarks</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add task description or remarks..."
              rows={3}
            />
          </div>

          {/* File Attachment */}
          <div>
            <Label>Attachment (Optional)</Label>
            {attachment ? (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 mt-1">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm truncate flex-1">{attachment.name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setAttachment(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <Input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.gif,.mp4,.mov,.doc,.docx,.xls,.xlsx"
                onChange={(e) => setAttachment(e.target.files?.[0] || null)}
                className="mt-1"
              />
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title || !assignedTo || createTask.isPending}
            >
              {createTask.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Task
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
