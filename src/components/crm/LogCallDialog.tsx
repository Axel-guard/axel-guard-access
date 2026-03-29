import { useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useCreateCallLog } from "@/hooks/useCallLogs";
import { useUpdateLead } from "@/hooks/useLeads";
import { useAuth } from "@/contexts/AuthContext";
import { Phone, Calendar, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogCallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  customerCode?: string | null;
  leadName?: string;
  currentStage?: string;
}

const CALL_STATUSES = ["Connected", "Not Connected", "Switched Off", "Busy"];
const CALL_TYPES = ["Outgoing", "Incoming"];
const DISPOSITIONS = ["Interested", "Not Interested", "Call Back Later", "Wrong Number", "Converted"];
const PIPELINE_STAGES = ["Suspect", "Prospect", "Approach", "Negotiate", "Order Done"];

const callStatusColor = (s: string) => {
  switch (s) {
    case "Connected":     return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "Not Connected": return "bg-red-100 text-red-700 border-red-300";
    case "Switched Off":  return "bg-slate-100 text-slate-600 border-slate-300";
    case "Busy":          return "bg-amber-100 text-amber-700 border-amber-300";
    default:              return "bg-muted text-muted-foreground";
  }
};

const stageColor = (s: string) => {
  switch (s) {
    case "Suspect":    return "bg-slate-100 text-slate-700";
    case "Prospect":   return "bg-blue-100 text-blue-700";
    case "Approach":   return "bg-yellow-100 text-yellow-700";
    case "Negotiate":  return "bg-orange-100 text-orange-700";
    case "Order Done": return "bg-emerald-100 text-emerald-700";
    default:           return "bg-muted text-muted-foreground";
  }
};

export const LogCallDialog = ({
  open,
  onOpenChange,
  leadId,
  customerCode,
  leadName,
  currentStage,
}: LogCallDialogProps) => {
  const { user } = useAuth();
  const createCallLog = useCreateCallLog();
  const updateLead = useUpdateLead();

  const [callStatus, setCallStatus] = useState("Connected");
  const [callType, setCallType] = useState("Outgoing");
  const [disposition, setDisposition] = useState("");
  const [notes, setNotes] = useState("");
  const [followupDate, setFollowupDate] = useState("");
  const [followupTime, setFollowupTime] = useState("");
  const [followupNotes, setFollowupNotes] = useState("");
  const [moveToStage, setMoveToStage] = useState(currentStage || "Suspect");

  const isConnected = callStatus === "Connected";
  const isPending = createCallLog.isPending || updateLead.isPending;

  const resetForm = () => {
    setCallStatus("Connected");
    setCallType("Outgoing");
    setDisposition("");
    setNotes("");
    setFollowupDate("");
    setFollowupTime("");
    setFollowupNotes("");
    setMoveToStage(currentStage || "Suspect");
  };

  const buildPayload = () => ({
    lead_id: leadId || null,
    customer_code: customerCode || null,
    user_name: user?.email?.split("@")[0] || "Unknown",
    call_status: callStatus,
    call_type: callType,
    disposition: isConnected ? disposition || null : null,
    notes: notes || null,
    stage_at_call: currentStage || null,
    followup_date: followupDate || null,
    followup_time: followupTime || null,
    followup_notes: followupNotes || null,
  });

  const handleSave = async () => {
    await createCallLog.mutateAsync(buildPayload());
    resetForm();
    onOpenChange(false);
  };

  const handleSaveAndMoveStage = async () => {
    await createCallLog.mutateAsync(buildPayload());
    if (leadId && moveToStage && moveToStage !== currentStage) {
      await updateLead.mutateAsync({ id: leadId, updates: { pipeline_stage: moveToStage } });
    }
    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5 text-primary" />
            Log Call
            {leadName && <span className="text-muted-foreground font-normal text-sm">— {leadName}</span>}
            {currentStage && (
              <Badge variant="outline" className={cn("text-xs ml-auto", stageColor(currentStage))}>
                {currentStage}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Call Status — visual buttons */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Call Status *</Label>
            <div className="mt-2 flex flex-wrap gap-2">
              {CALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setCallStatus(s)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    callStatus === s
                      ? callStatusColor(s) + " ring-2 ring-offset-1 ring-current"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* Call Type */}
          <div className="flex gap-3">
            {CALL_TYPES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setCallType(t)}
                className={cn(
                  "flex-1 rounded-lg border py-2 text-xs font-medium transition-all",
                  callType === t
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Disposition (only if connected) */}
          {isConnected && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Disposition</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {DISPOSITIONS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDisposition(d === disposition ? "" : d)}
                    className={cn(
                      "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                      disposition === d
                        ? d === "Interested" || d === "Converted"
                          ? "border-emerald-300 bg-emerald-100 text-emerald-700 ring-2 ring-offset-1 ring-emerald-400"
                          : d === "Not Interested"
                          ? "border-red-300 bg-red-100 text-red-700 ring-2 ring-offset-1 ring-red-400"
                          : "border-primary bg-primary/10 text-primary ring-2 ring-offset-1 ring-primary"
                        : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                    )}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Notes / Remarks</Label>
            <Textarea
              className="mt-1.5"
              rows={2}
              placeholder="What was discussed..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Follow-up */}
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5" />
              Next Follow-up
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={followupDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setFollowupDate(e.target.value)}
                />
              </div>
              <div>
                <Label className="text-xs">Time</Label>
                <Input
                  type="time"
                  className="mt-1"
                  value={followupTime}
                  onChange={(e) => setFollowupTime(e.target.value)}
                />
              </div>
            </div>
            {followupDate && (
              <div>
                <Label className="text-xs">Reminder Note</Label>
                <Input
                  className="mt-1"
                  placeholder="e.g. Call back about pricing..."
                  value={followupNotes}
                  onChange={(e) => setFollowupNotes(e.target.value)}
                />
              </div>
            )}
          </div>

          {/* Move Stage section */}
          <div className="rounded-lg border border-border bg-muted/20 p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <ArrowRight className="h-3.5 w-3.5" />
              Move to Stage
            </p>
            <div className="flex flex-wrap gap-2">
              {PIPELINE_STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setMoveToStage(s)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-xs font-medium transition-all",
                    moveToStage === s
                      ? stageColor(s) + " ring-2 ring-offset-1 ring-current border-current"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted"
                  )}
                >
                  {s}
                  {s === currentStage && <span className="ml-1 opacity-60">(current)</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-1 border-t border-border">
            <Button variant="outline" onClick={() => { resetForm(); onOpenChange(false); }}>
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isPending}
              className="border-primary/30 text-primary hover:bg-primary/5"
            >
              {createCallLog.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Call Log
            </Button>
            <Button
              onClick={handleSaveAndMoveStage}
              disabled={isPending}
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save & Move Stage
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
