import { useCallLogs } from "@/hooks/useCallLogs";
import { LogCallDialog } from "@/components/crm/LogCallDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Phone, PhoneCall, PhoneOff, PhoneMissed, Calendar, Plus } from "lucide-react";
import { format } from "date-fns";
import { useState } from "react";

interface CustomerCallingTabProps {
  customerCode: string;
  leadId?: string | null;
  leadName?: string;
  currentStage?: string;
}

const callStatusIcon = (status: string) => {
  switch (status) {
    case "Connected": return <PhoneCall className="h-3.5 w-3.5 text-emerald-500" />;
    case "Not Connected": return <PhoneMissed className="h-3.5 w-3.5 text-red-500" />;
    case "Switched Off": return <PhoneOff className="h-3.5 w-3.5 text-slate-500" />;
    case "Busy": return <Phone className="h-3.5 w-3.5 text-amber-500" />;
    default: return <Phone className="h-3.5 w-3.5 text-muted-foreground" />;
  }
};

const callStatusColor = (status: string) => {
  switch (status) {
    case "Connected": return "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "Not Connected": return "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400";
    case "Switched Off": return "bg-slate-100 text-slate-600 border-slate-300 dark:bg-slate-800 dark:text-slate-400";
    case "Busy": return "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400";
    default: return "bg-muted text-muted-foreground";
  }
};

const dispositionColor = (d: string) => {
  switch (d) {
    case "Interested": return "bg-blue-100 text-blue-700 border-blue-300";
    case "Converted": return "bg-emerald-100 text-emerald-700 border-emerald-300";
    case "Not Interested": return "bg-red-100 text-red-700 border-red-300";
    case "Call Back Later": return "bg-amber-100 text-amber-700 border-amber-300";
    case "Wrong Number": return "bg-slate-100 text-slate-600 border-slate-300";
    default: return "bg-muted text-muted-foreground";
  }
};

export const CustomerCallingTab = ({
  customerCode,
  leadId,
  leadName,
  currentStage,
}: CustomerCallingTabProps) => {
  const [logOpen, setLogOpen] = useState(false);
  const { data: calls, isLoading } = useCallLogs(leadId, customerCode);

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Calling History</h3>
          <p className="text-sm text-muted-foreground">{calls?.length || 0} call{calls?.length !== 1 ? "s" : ""} logged</p>
        </div>
        <Button size="sm" onClick={() => setLogOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Log Call
        </Button>
      </div>

      {(!calls || calls.length === 0) ? (
        <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <Phone className="h-10 w-10 mb-3 opacity-30" />
          <p className="font-medium">No calls logged yet</p>
          <p className="text-sm mt-1">Click "Log Call" to record a call with this customer.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {calls.map((call, i) => (
            <div
              key={call.id || i}
              className="relative rounded-lg border border-border bg-card p-4"
            >
              {/* Timeline line */}
              {i < calls.length - 1 && (
                <div className="absolute left-[1.6rem] top-12 bottom-0 w-px bg-border -mb-3 translate-y-2" />
              )}

              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted">
                  {callStatusIcon(call.call_status)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline" className={`text-xs ${callStatusColor(call.call_status)}`}>
                      {call.call_status}
                    </Badge>
                    {call.call_type && (
                      <Badge variant="outline" className="text-xs text-muted-foreground">
                        {call.call_type}
                      </Badge>
                    )}
                    {call.disposition && (
                      <Badge variant="outline" className={`text-xs ${dispositionColor(call.disposition)}`}>
                        {call.disposition}
                      </Badge>
                    )}
                    {call.stage_at_call && (
                      <span className="text-xs text-muted-foreground">Stage: {call.stage_at_call}</span>
                    )}
                  </div>

                  {call.notes && (
                    <p className="text-sm text-foreground mt-1">{call.notes}</p>
                  )}

                  <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                    <span>{call.created_at ? format(new Date(call.created_at), "dd MMM yyyy, hh:mm a") : "—"}</span>
                    {call.user_name && <span>by {call.user_name}</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <LogCallDialog
        open={logOpen}
        onOpenChange={setLogOpen}
        leadId={leadId}
        customerCode={customerCode}
        leadName={leadName}
        currentStage={currentStage}
      />
    </div>
  );
};
