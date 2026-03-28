import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerTimeline, TimelineEvent } from "@/hooks/useCustomerDetails";
import { format } from "date-fns";
import {
  User, FileText, ShoppingCart, Truck, CreditCard, Ticket,
  CheckCircle, Clock, XCircle, Filter, IndianRupee,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerHistoryTabProps {
  customerCode: string;
  mobileNumber?: string;
}

type EventFilter = "all" | TimelineEvent["type"];

const EVENT_FILTERS: { key: EventFilter; label: string; activeClass: string }[] = [
  { key: "all",       label: "All",       activeClass: "bg-foreground text-background" },
  { key: "quotation", label: "Quotation", activeClass: "bg-purple-600 text-white" },
  { key: "sale",      label: "Sale",      activeClass: "bg-green-600 text-white" },
  { key: "dispatch",  label: "Dispatch",  activeClass: "bg-orange-500 text-white" },
  { key: "payment",   label: "Payment",   activeClass: "bg-emerald-600 text-white" },
  { key: "ticket",    label: "Ticket",    activeClass: "bg-red-600 text-white" },
  { key: "lead",      label: "Lead",      activeClass: "bg-blue-600 text-white" },
];

const EVENT_META: Record<TimelineEvent["type"], {
  icon: React.ElementType;
  dot: string;        // bg colour for timeline dot
  badge: string;      // badge colour classes
  label: string;
}> = {
  lead:      { icon: User,        dot: "bg-blue-500",    badge: "bg-blue-100 text-blue-700",    label: "Lead" },
  quotation: { icon: FileText,    dot: "bg-purple-500",  badge: "bg-purple-100 text-purple-700",label: "Quotation" },
  sale:      { icon: ShoppingCart,dot: "bg-green-500",   badge: "bg-green-100 text-green-700",  label: "Sale" },
  dispatch:  { icon: Truck,       dot: "bg-orange-500",  badge: "bg-orange-100 text-orange-700",label: "Dispatch" },
  payment:   { icon: CreditCard,  dot: "bg-emerald-500", badge: "bg-emerald-100 text-emerald-700",label:"Payment" },
  ticket:    { icon: Ticket,      dot: "bg-red-500",     badge: "bg-red-100 text-red-700",      label: "Ticket" },
};

const STATUS_BADGE: Record<string, { cls: string; icon: React.ElementType }> = {
  Approved:     { cls: "bg-green-100 text-green-700",   icon: CheckCircle },
  Pending:      { cls: "bg-yellow-100 text-yellow-700", icon: Clock },
  Rejected:     { cls: "bg-red-100 text-red-700",       icon: XCircle },
  Open:         { cls: "bg-blue-100 text-blue-700",     icon: Clock },
  Closed:       { cls: "bg-gray-100 text-gray-700",     icon: CheckCircle },
  Completed:    { cls: "bg-green-100 text-green-700",   icon: CheckCircle },
  "In Progress":{ cls: "bg-amber-100 text-amber-700",   icon: Clock },
};

const StatusBadge = ({ status }: { status?: string }) => {
  if (!status) return null;
  const v = STATUS_BADGE[status] ?? { cls: "bg-gray-100 text-gray-700", icon: Clock };
  const Icon = v.icon;
  return (
    <Badge className={`${v.cls} border-0 gap-1 text-xs`}>
      <Icon className="h-3 w-3" />{status}
    </Badge>
  );
};

const fmtDateTime = (d: string) => {
  try { return format(new Date(d), "dd MMM yyyy, h:mm a"); }
  catch { return d; }
};

export const CustomerHistoryTab = ({ customerCode, mobileNumber }: CustomerHistoryTabProps) => {
  const { data: timeline, isLoading } = useCustomerTimeline(customerCode, mobileNumber);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("all");

  const filtered = useMemo(() => {
    if (!timeline) return [];
    return activeFilter === "all" ? timeline : timeline.filter((e) => e.type === activeFilter);
  }, [timeline, activeFilter]);

  const counts = useMemo(() => {
    if (!timeline) return {} as Record<string, number>;
    return timeline.reduce((acc, e) => { acc[e.type] = (acc[e.type] ?? 0) + 1; return acc; }, {} as Record<string, number>);
  }, [timeline]);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6 space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-64" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <Card className="shadow-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <Clock className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">No History Yet</h3>
          <p className="text-muted-foreground">Customer activity will appear here as events occur.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Activity Timeline
            <span className="text-sm font-normal text-muted-foreground">
              ({timeline.length} event{timeline.length !== 1 ? "s" : ""})
            </span>
          </CardTitle>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {EVENT_FILTERS.map((f) => {
            const cnt = f.key === "all" ? timeline.length : (counts[f.key] ?? 0);
            if (f.key !== "all" && cnt === 0) return null;
            const isActive = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all border",
                  isActive ? `${f.activeClass} border-transparent shadow-sm` : "bg-transparent border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                {f.label}
                <span className={cn("flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold px-1", isActive ? "bg-white/20" : "bg-muted")}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Filter className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No {activeFilter} events found.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Vertical connector line */}
            <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-border/60" />

            <div className="space-y-0">
              {filtered.map((event) => {
                const meta = EVENT_META[event.type] ?? EVENT_META.lead;
                const Icon = meta.icon;

                return (
                  <div key={event.id} className="relative flex gap-4 pl-1 pb-5 last:pb-0">
                    {/* Timeline dot */}
                    <div className={cn(
                      "relative z-10 h-9 w-9 rounded-full flex items-center justify-center shrink-0 shadow-sm ring-2 ring-background",
                      meta.dot
                    )}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>

                    {/* Event card */}
                    <div className="flex-1 min-w-0 rounded-xl border border-border/50 bg-card shadow-sm p-4">
                      {/* Top row: type badge + title + status */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Badge className={`${meta.badge} border-0 text-[10px] px-2 py-0 shrink-0`}>
                          {meta.label}
                        </Badge>
                        <span className="font-semibold text-sm text-foreground flex-1 min-w-0">
                          {event.title}
                        </span>
                        <StatusBadge status={event.status} />
                      </div>

                      {/* Date + Amount row */}
                      <div className="flex flex-wrap items-center gap-4 mb-2">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          <span>{fmtDateTime(event.date)}</span>
                        </div>
                        {event.amount != null && (
                          <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                            <IndianRupee className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                            <span className="text-emerald-700 dark:text-emerald-400 tabular-nums">
                              {Number(event.amount).toLocaleString("en-IN")}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Description / detail lines */}
                      {event.description ? (
                        <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2 leading-relaxed">
                          {event.description.split(" · ").map((part, i) => (
                            <span key={i} className="block">{part}</span>
                          ))}
                        </div>
                      ) : (
                        /* Always show a "no extra detail" placeholder so the card isn't empty */
                        <div className="text-xs text-muted-foreground/50 italic">
                          {event.type === "lead" && "Customer registered in the system."}
                          {event.type === "sale" && "No product details recorded."}
                          {event.type === "quotation" && "No product items recorded."}
                          {event.type === "dispatch" && "No tracking information available."}
                          {event.type === "payment" && "Payment recorded."}
                          {event.type === "ticket" && "No additional notes."}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
