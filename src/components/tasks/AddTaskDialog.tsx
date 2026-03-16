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
import { AddEmailDialog } from "@/components/shared/AddEmailDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
  const [showAddEmailDialog, setShowAddEmailDialog] = useState(false);
  const [emailMissingError, setEmailMissingError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      const { data: employees } = await supabase
        .from("employees")
        .select("name, email, employee_role, user_id")
        .eq("is_active", true);

      if (!employees) return;

      const userList: AllowedUser[] = [];
      const seen = new Set<string>();

      for (const emp of employees) {
        if (!emp.user_id || seen.has(emp.user_id)) continue;
        seen.add(emp.user_id);

        userList.push({
          userId: emp.user_id,
          email: emp.email || "",
          name: emp.name,
          role: emp.employee_role || "User",
        });
      }

      setUsers(userList);
    };
    fetchUsers();
  }, [open]);

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

  const isCustomerTicket = !!customerCode.trim() && customerFound;

  const handleSubmit = async () => {
    if (!title || !assignedTo) return;

    if (isCustomerTicket && !customerEmail.trim()) {
      setEmailMissingError(true);
      return;
    }
    setEmailMissingError(false);

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
      task_type: isCustomerTicket ? "Customer" : "Internal",
      customer_email_enabled: isCustomerTicket ? customerEmailEnabled : false,
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
    setEmailMissingError(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Ticket</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="task-title">Ticket Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter ticket title"
            />
          </div>

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

          {isCustomerTicket && (
            <div className="flex items-center justify-between rounded-lg border border-border p-3">
              <div>
                <p className="text-sm font-medium">Enable Customer Email Communication</p>
                <p className="text-xs text-muted-foreground">
                  Send ticket updates to customer via email
                </p>
              </div>
              <Switch
                checked={customerEmailEnabled}
                onCheckedChange={setCustomerEmailEnabled}
              />
            </div>
          )}

          <div>
            <Label htmlFor="task-desc">Description / Remarks</Label>
            <Textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add ticket description or remarks..."
              rows={3}
            />
          </div>

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

          {emailMissingError && isCustomerTicket && (
            <Alert variant="destructive">
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Customer email ID is not present. First add email ID, then complete this form.
                  </AlertDescription>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setShowAddEmailDialog(true)}
                  className="ml-4 shrink-0"
                >
                  Add Email ID
                </Button>
              </div>
            </Alert>
          )}

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
              Create Ticket
            </Button>
          </div>
        </div>

        <AddEmailDialog
          open={showAddEmailDialog}
          onOpenChange={setShowAddEmailDialog}
          customerCode={customerCode}
          customerName={customerName}
          onEmailSaved={(email) => {
            setCustomerEmail(email);
            setEmailMissingError(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
};
