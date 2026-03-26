import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Mail, Send, Truck, MapPin, Sparkles, Loader2 } from "lucide-react";
import { useEmail } from "@/hooks/useEmail";

interface SendDetailsDropdownProps {
  orderId: string;
  saleType?: string;
  variant?: "icon" | "button";
  onSendAll?: () => void;
}

export const SendDetailsDropdown = ({
  orderId,
  saleType,
  variant = "icon",
  onSendAll,
}: SendDetailsDropdownProps) => {
  const { sendSaleEmail, sendDispatchEmail, sendTrackingEmail, sendAllDetailsEmail, isLoading } = useEmail();
  const [sendingType, setSendingType] = useState<string | null>(null);

  // Suppress emails for "Without" bill sales
  const isWithoutBill = saleType === "Without" || saleType === "Without GST";

  const handleSend = async (type: "sale" | "dispatch" | "tracking" | "all") => {
    if (isWithoutBill) return;
    setSendingType(type);
    try {
      if (type === "sale") {
        await sendSaleEmail(orderId);
      } else if (type === "dispatch") {
        await sendDispatchEmail(orderId);
      } else if (type === "tracking") {
        await sendTrackingEmail(orderId);
      } else if (type === "all") {
        if (onSendAll) {
          onSendAll();
        } else {
          // Send all sequentially
          await sendSaleEmail(orderId);
          await sendDispatchEmail(orderId);
          await sendTrackingEmail(orderId);
        }
      }
    } finally {
      setSendingType(null);
    }
  };

  const isBusy = isLoading || !!sendingType;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {variant === "button" ? (
          <Button variant="outline" size="sm" className="gap-1.5" disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Mail className="h-3.5 w-3.5" />
            )}
            Send Details
          </Button>
        ) : (
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isBusy}>
            {isBusy ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Send Details via Email
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {isWithoutBill ? (
          <div className="px-2 py-3 text-xs text-muted-foreground text-center">
            Email disabled for "Without Bill" sales
          </div>
        ) : (
          <>
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleSend("sale"); }}
              disabled={sendingType === "sale"}
            >
              {sendingType === "sale" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Send className="mr-2 h-4 w-4 text-primary" />
              )}
              Sale Details
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleSend("dispatch"); }}
              disabled={sendingType === "dispatch"}
            >
              {sendingType === "dispatch" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Truck className="mr-2 h-4 w-4 text-success" />
              )}
              Dispatch Details
            </DropdownMenuItem>
            
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleSend("tracking"); }}
              disabled={sendingType === "tracking"}
            >
              {sendingType === "tracking" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <MapPin className="mr-2 h-4 w-4 text-warning" />
              )}
              Tracking Details
            </DropdownMenuItem>
            
            <DropdownMenuSeparator />
            
            <DropdownMenuItem
              onClick={(e) => { e.stopPropagation(); handleSend("all"); }}
              disabled={sendingType === "all"}
              className="font-medium"
            >
              {sendingType === "all" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4 text-destructive" />
              )}
              Send All Details
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
