import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCallLogs } from "@/hooks/useCallLogs";
import { format } from "date-fns";
import { Phone, PhoneOff, PhoneMissed, BatteryLow, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface CallHistoryDialogProps {
  leadId: string | null;
  customerCode: string | null;
  leadName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusIcon = (status: string) => {
  switch (status) {
    case "Connected":     return <Phone className="h-3.5 w-3.5 text-emerald-600" />;
    case "Not Connected": return <PhoneOff className="h-3.5 w-3.5 text-red-500" />;
    case "Busy":          return <PhoneMissed className="h-3.5 w-3.5 text-amber-500" />;
    case "Switched Off":  return <BatteryLow className="h-3.5 w-3.5 text-slate-500" />;
    default:              return <Phone className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const statusBadgeClass = (status: string) => {
  switch (status) {
    case "Connected":     return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Not Connected": return "bg-red-100 text-red-700 border-red-200";
    case "Busy":          return "bg-amber-100 text-amber-700 border-amber-200";
    case "Switched Off":  return "bg-slate-100 text-slate-600 border-slate-200";
    default:              return "bg-muted text-muted-foreground";
  }
};

const dispositionClass = (d: string) => {
  switch (d) {
    case "Interested":       return "bg-blue-100 text-blue-700 border-blue-200";
    case "Converted":        return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "Not Interested":   return "bg-red-100 text-red-700 border-red-200";
    case "Call Back Later":  return "bg-violet-100 text-violet-700 border-violet-200";
    case "Wrong Number":     return "bg-gray-100 text-gray-600 border-gray-200";
    default:                 return "bg-muted text-muted-foreground";
  }
};

export const CallHistoryDialog = ({
  leadId,
  customerCode,
  leadName,
  open,
  onOpenChange,
}: CallHistoryDialogProps) => {
  const { data: logs = [], isLoading } = useCallLogs(leadId, customerCode);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Call History
            {leadName && <span className="text-muted-foreground font-normal text-sm">— {leadName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-0 -mx-1 px-1">
          {isLoading ? (
            <div className="space-y-3 py-2">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Phone className="h-10 w-10 opacity-20 mb-3" />
              <p className="font-medium">No calls logged yet</p>
              <p className="text-xs mt-1">Use "Log Call" to record your first interaction</p>
            </div>
          ) : (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

              <div className="space-y-1 py-1">
                {logs.map((log, idx) => (
                  <div key={log.id || idx} className="flex gap-4 py-3 pr-1 group hover:bg-muted/30 rounded-lg transition-colors pl-2">
                    {/* Icon dot */}
                    <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card shadow-sm">
                      {statusIcon(log.call_status)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cn("text-xs", statusBadgeClass(log.call_status))}>
                          {log.call_status}
                        </Badge>
                        {log.disposition && (
                          <Badge variant="outline" className={cn("text-xs", dispositionClass(log.disposition))}>
                            {log.disposition}
                          </Badge>
                        )}
                        {log.call_type && (
                          <span className="text-[10px] text-muted-foreground">{log.call_type}</span>
                        )}
                        {log.stage_at_call && (
                          <span className="text-[10px] text-muted-foreground">Stage: {log.stage_at_call}</span>
                        )}
                      </div>

                      {log.notes && (
                        <p className="mt-1 text-xs text-muted-foreground flex items-start gap-1">
                          <MessageSquare className="h-3 w-3 mt-0.5 shrink-0" />
                          {log.notes}
                        </p>
                      )}

                      <div className="mt-1 flex items-center gap-3 text-[10px] text-muted-foreground">
                        <span>
                          {log.created_at
                            ? format(new Date(log.created_at), "dd MMM yyyy, hh:mm a")
                            : "—"}
                        </span>
                        {log.user_name && <span>by {log.user_name}</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {logs.length > 0 && (
          <div className="pt-2 border-t border-border text-xs text-muted-foreground text-center">
            {logs.length} call{logs.length > 1 ? "s" : ""} logged
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
