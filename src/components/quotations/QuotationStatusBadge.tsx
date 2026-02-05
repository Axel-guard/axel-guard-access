import { Badge } from "@/components/ui/badge";
import {
  Clock,
  Check,
  X,
  ArrowRightLeft,
  Send,
  FileText,
} from "lucide-react";

interface QuotationStatusBadgeProps {
  status: string;
}

export const QuotationStatusBadge = ({ status }: QuotationStatusBadgeProps) => {
  switch (status) {
    case "Pending Approval":
      return (
        <Badge className="bg-warning/10 text-warning border-warning/20">
          <Clock className="mr-1 h-3 w-3" />
          Pending Approval
        </Badge>
      );
    case "Approved":
      return (
        <Badge className="bg-success/10 text-success border-success/20">
          <Check className="mr-1 h-3 w-3" />
          Approved
        </Badge>
      );
    case "Rejected":
      return (
        <Badge className="bg-destructive/10 text-destructive border-destructive/20">
          <X className="mr-1 h-3 w-3" />
          Rejected
        </Badge>
      );
    case "Converted":
      return (
        <Badge className="bg-primary/10 text-primary border-primary/20">
          <ArrowRightLeft className="mr-1 h-3 w-3" />
          Converted
        </Badge>
      );
    case "Sent":
      return (
        <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20">
          <Send className="mr-1 h-3 w-3" />
          Sent
        </Badge>
      );
    default:
      return (
        <Badge className="bg-muted text-muted-foreground">
          <FileText className="mr-1 h-3 w-3" />
          Draft
        </Badge>
      );
  }
};