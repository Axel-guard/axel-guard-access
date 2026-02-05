import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCustomerTimeline, TimelineEvent } from "@/hooks/useCustomerDetails";
import { format } from "date-fns";
import {
  User,
  FileText,
  ShoppingCart,
  Truck,
  CreditCard,
  Ticket,
  CheckCircle,
  Clock,
  XCircle,
} from "lucide-react";

interface CustomerHistoryTabProps {
  customerCode: string;
}

const getEventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "lead":
      return User;
    case "quotation":
      return FileText;
    case "sale":
      return ShoppingCart;
    case "dispatch":
      return Truck;
    case "payment":
      return CreditCard;
    case "ticket":
      return Ticket;
    default:
      return Clock;
  }
};

const getEventColor = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "lead":
      return "bg-blue-500";
    case "quotation":
      return "bg-purple-500";
    case "sale":
      return "bg-green-500";
    case "dispatch":
      return "bg-orange-500";
    case "payment":
      return "bg-emerald-500";
    case "ticket":
      return "bg-red-500";
    default:
      return "bg-gray-500";
  }
};

const getStatusBadge = (status?: string) => {
  if (!status) return null;

  const variants: Record<string, { color: string; icon: any }> = {
    Approved: { color: "bg-green-100 text-green-700", icon: CheckCircle },
    Pending: { color: "bg-yellow-100 text-yellow-700", icon: Clock },
    Rejected: { color: "bg-red-100 text-red-700", icon: XCircle },
    Open: { color: "bg-blue-100 text-blue-700", icon: Clock },
    Closed: { color: "bg-gray-100 text-gray-700", icon: CheckCircle },
    Completed: { color: "bg-green-100 text-green-700", icon: CheckCircle },
  };

  const variant = variants[status] || { color: "bg-gray-100 text-gray-700", icon: Clock };
  const Icon = variant.icon;

  return (
    <Badge className={`${variant.color} border-0 gap-1`}>
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

export const CustomerHistoryTab = ({ customerCode }: CustomerHistoryTabProps) => {
  const { data: timeline, isLoading } = useCustomerTimeline(customerCode);

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
            ))}
          </div>
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
          <p className="text-muted-foreground">
            Customer activity will appear here as events occur.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="text-lg">Activity Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-6">
            {timeline.map((event, index) => {
              const Icon = getEventIcon(event.type);
              const color = getEventColor(event.type);

              return (
                <div key={event.id} className="relative flex gap-4 pl-2">
                  {/* Icon */}
                  <div
                    className={`relative z-10 h-8 w-8 rounded-full ${color} flex items-center justify-center shrink-0`}
                  >
                    <Icon className="h-4 w-4 text-white" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0 pb-4">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-medium text-foreground">{event.title}</h4>
                      {getStatusBadge(event.status)}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      <span>{format(new Date(event.date), "dd MMM yyyy, h:mm a")}</span>
                      {event.amount !== undefined && (
                        <span className="font-medium text-foreground">
                          ₹{event.amount.toLocaleString("en-IN")}
                        </span>
                      )}
                    </div>

                    {event.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
