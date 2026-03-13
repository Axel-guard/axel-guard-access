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
import { supabase } from "@/integrations/supabase/client";
import { useCreateTask } from "@/hooks/useTasks";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";

interface AddTaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface AllowedUser {
  id: string;
  email: string;
  role: string;
}

export const AddTaskDialog = ({ open, onOpenChange }: AddTaskDialogProps) => {
  const createTask = useCreateTask();
  const [title, setTitle] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [deadline, setDeadline] = useState("");
  const [customerCode, setCustomerCode] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [description, setDescription] = useState("");
  const [customerFound, setCustomerFound] = useState<boolean | null>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [users, setUsers] = useState<AllowedUser[]>([]);

  // Fetch allowed users for assignment
  useEffect(() => {
    if (!open) return;
    const fetchUsers = async () => {
      // Get allowed emails with their user IDs from user_roles
      const { data: allowedEmails } = await supabase
        .from("allowed_emails")
        .select("email, role");

      if (!allowedEmails) return;

      // Get user_roles to map emails to user IDs
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      if (!roles) return;

      // We need to match - for now use allowed_emails as the source
      // and user_roles for user_id mapping
      const userList: AllowedUser[] = [];
      for (const ae of allowedEmails) {
        // Find matching user_role entry - we'll use email as display
        const matchingRole = roles.find(r => r.role === ae.role);
        if (matchingRole) {
          userList.push({
            id: matchingRole.user_id,
            email: ae.email,
            role: ae.role,
          });
        }
      }

      // Deduplicate by user_id
      const unique = userList.filter(
        (u, i, arr) => arr.findIndex(x => x.id === u.id) === i
      );
      setUsers(unique);
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
      return;
    }

    const timer = setTimeout(async () => {
      setLookingUp(true);
      const { data } = await supabase
        .from("leads")
        .select("customer_name, mobile_number, location, company_name")
        .eq("customer_code", customerCode.trim())
        .maybeSingle();

      if (data) {
        setCustomerFound(true);
        setCustomerName(data.customer_name || "");
        setCustomerPhone(data.mobile_number || "");
        setCustomerLocation(data.location || "");
        setCompanyName(data.company_name || "");
      } else {
        setCustomerFound(false);
      }
      setLookingUp(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [customerCode]);

  const handleSubmit = async () => {
    if (!title || !assignedTo || !deadline) return;

    await createTask.mutateAsync({
      title,
      description: description || undefined,
      customer_code: customerCode || undefined,
      customer_name: customerName || undefined,
      customer_phone: customerPhone || undefined,
      customer_location: customerLocation || undefined,
      company_name: companyName || undefined,
      deadline: new Date(deadline).toISOString(),
      assigned_to: assignedTo,
    });

    resetForm();
    onOpenChange(false);
  };

  const resetForm = () => {
    setTitle("");
    setAssignedTo("");
    setDeadline("");
    setCustomerCode("");
    setCustomerName("");
    setCustomerPhone("");
    setCustomerLocation("");
    setCompanyName("");
    setDescription("");
    setCustomerFound(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Required Fields */}
          <div>
            <Label htmlFor="task-title">Task Title *</Label>
            <Input
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
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
                  <SelectItem key={u.id} value={u.id}>
                    {u.email} ({u.role})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="deadline">Deadline *</Label>
            <Input
              id="deadline"
              type="datetime-local"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
            />
          </div>

          {/* Optional: Customer Code */}
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

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!title || !assignedTo || !deadline || createTask.isPending}
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
