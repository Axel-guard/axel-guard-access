import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Mail, Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

interface AddEmailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customerCode: string;
  customerName: string;
  onEmailSaved: (email: string) => void;
}

export const AddEmailDialog = ({
  open,
  onOpenChange,
  customerCode,
  customerName,
  onEmailSaved,
}: AddEmailDialogProps) => {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const queryClient = useQueryClient();

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSave = async () => {
    if (!isValidEmail(email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("leads")
        .update({ email })
        .eq("customer_code", customerCode);

      if (error) throw error;

      toast.success(`Email saved for ${customerName}`);
      queryClient.invalidateQueries({ queryKey: ["leads"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales"] });
      queryClient.invalidateQueries({ queryKey: ["all-sales-balance"] });
      onEmailSaved(email);
      onOpenChange(false);
      setEmail("");
    } catch (err: any) {
      toast.error(err.message || "Failed to save email");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Add Email ID
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Customer <span className="font-semibold text-foreground">{customerName}</span> ({customerCode}) does not have an email ID. Please add one to continue.
          </p>
          <div className="space-y-2">
            <Label htmlFor="add-email">Email ID *</Label>
            <Input
              id="add-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              autoFocus
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !email.trim()}>
            {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Save Email
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
