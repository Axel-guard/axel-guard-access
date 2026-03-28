import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useCustomerTimeline, TimelineEvent } from "@/hooks/useCustomerDetails";
import { format } from "date-fns";
import {
  User, FileText, ShoppingCart, Truck, CreditCard, Ticket,
  CheckCircle, Clock, XCircle, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface CustomerHistoryTabProps {
  customerCode: string;
  mobileNumber?: string;
}

type EventFilter = "all" | TimelineEvent["type"];

const EVENT_FILTERS: { key: EventFilter; label: string; color: string }[] = [
  { key: "all",       label: "All",       color: "bg-muted text-foreground" },
  { key: "quotation", label: "Quotation", color: "bg-purple-100 text-purple-700" },
  { key: "sale",      label: "Sale",      color: "bg-green-100 text-green-700" },
  { key: "dispatch",  label: "Dispatch",  color: "bg-orange-100 text-orange-700" },
  { key: "payment",   label: "Payment",   color: "bg-emerald-100 text-emerald-700" },
  { key: "ticket",    label: "Ticket",    color: "bg-red-100 text-red-700" },
  { key: "lead",      label: "Lead",      color: "bg-blue-100 text-blue-700" },
];

const eventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "lead":      return User;
    case "quotation": return FileText;
    case "sale":      return ShoppingCart;
    case "dispatch":  return Truck;
    case "payment":   return CreditCard;
    case "ticket":    return Ticket;
    default:          return Clock;
  }
};

const eventColor = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "lead":      return "bg-blue-500";
    case "quotation": return "bg-purple-500";
    case "sale":      return "bg-green-500";
    case "dispatch":  return "bg-orange-500";
    case "payment":   return "bg-emerald-500";
    case "ticket":    return "bg-red-500";
    default:          return "bg-gray-500";
  }
};

const eventLabel = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "lead":      return { text: "Lead",      cls: "bg-blue-100 text-blue-700" };
    case "quotation": return { text: "Quotation", cls: "bg-purple-100 text-purple-700" };
    case "sale":      return { text: "Sale",      cls: "bg-green-100 text-green-700" };
    case "dispatch":  return { text: "Dispatch",  cls: "bg-orange-100 text-orange-700" };
    case "payment":   return { text: "Payment",   cls: "bg-emerald-100 text-emerald-700" };
    case "ticket":    return { text: "Ticket",    cls: "bg-red-100 text-red-700" };
    default:          return { text: type,        cls: "bg-gray-100 text-gray-700" };
  }
};

const statusBadge = (status?: string) => {
  if (!status) return null;
  const variants: Record<string, { color: string; icon: any }> = {
    Approved:   { color: "bg-green-100 text-green-700",  icon: CheckCircle },
    Pending:    { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    Rejected:   { color: "bg-red-100 text-red-700",      icon: XCircle },
    Open:       { color: "bg-blue-100 text-blue-700",    icon: Clock },
    Closed:     { color: "bg-gray-100 text-gray-700",    icon: CheckCircle },
    Completed:  { color: "bg-green-100 text-green-700",  icon: CheckCircle },
    "In Progress": { color: "bg-amber-100 text-amber-700", icon: Clock },
  };
  const v = variants[status] ?? { color: "bg-gray-100 text-gray-700", icon: Clock };
  const Icon = v.icon;
  return (
    <Badge className={`${v.color} border-0 gap-1 text-xs`}>
      <Icon className="h-3 w-3" />{status}
    </Badge>
  );
};

export const CustomerHistoryTab = ({ customerCode, mobileNumber }: CustomerHistoryTabProps) => {
  const { data: timeline, isLoading } = useCustomerTimeline(customerCode, mobileNumber);
  const [activeFilter, setActiveFilter] = useState<EventFilter>("all");

  const filtered = useMemo(() => {
    if (!timeline) return [];
    if (activeFilter === "all") return timeline;
    return timeline.filter((e) => e.type === activeFilter);
  }, [timeline, activeFilter]);

  // Count per type for filter badges
  const counts = useMemo(() => {
    if (!timeline) return {} as Record<string, number>;
    return timeline.reduce((acc, e) => {
      acc[e.type] = (acc[e.type] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
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
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Activity Timeline
            <span className="text-sm font-normal text-muted-foreground ml-1">
              ({timeline.length} event{timeline.length !== 1 ? "s" : ""})
            </span>
          </CardTitle>
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5 mt-2">
          {EVENT_FILTERS.map((f) => {
            const cnt = f.key === "all" ? timeline.length : (counts[f.key] ?? 0);
            if (f.key !== "all" && cnt === 0) return null;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-all border",
                  activeFilter === f.key
                    ? `${f.color} border-transparent shadow-sm`
                    : "bg-transparent border-border/50 text-muted-foreground hover:border-border"
                )}
              >
                {f.label}
                <span className={cn(
                  "flex h-4 min-w-4 items-center justify-center rounded-full text-[10px] font-bold px-1",
                  activeFilter === f.key ? "bg-black/10" : "bg-muted"
                )}>
                  {cnt}
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Filter className="h-8 w-8 text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No {activeFilter} events found.</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline vertical line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-5">
              {filtered.map((event) => {
                const Icon = eventIcon(event.type);
                const color = eventColor(event.type);
                const label = eventLabel(event.type);

                return (
                  <div key={event.id} className="relative flex gap-4 pl-2">
                    {/* Circle icon */}
                    <div className={cn(
                      "relative z-10 h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm",
                      color
                    )}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-4 border-b border-border/30 last:border-0">
                      <div className="flex flex-wrap items-start gap-2 mb-0.5">
                        <Badge className={`${label.cls} border-0 text-[10px] px-1.5 py-0 shrink-0`}>
                          {label.text}
                        </Badge>
                        <h4 className="font-medium text-sm text-foreground leading-snug">
                          {event.title}
                        </h4>
                        {statusBadge(event.status)}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>
                          {(() => {
                            try {
                              return format(new Date(event.date), "dd MMM yyyy, h:mm a");
                            } catch {
                              return event.date;
                            }
                          })()}
                        </span>
                        {event.amount !== undefined && (
                          <span className="font-semibold text-foreground">
                            ₹{Number(event.amount).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      {event.description && (
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                          {event.description}
                        </p>
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
