import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useCallback } from "react";
 
type EmailType = "sale" | "dispatch" | "tracking";

interface DispatchEmailData {
  dispatchDate?: string;
  serialNumbers?: string[];
  productName?: string;
  totalQuantity?: number;
}
 
 export const useEmail = () => {
   const [isLoading, setIsLoading] = useState(false);
 
  const sendEmail = useCallback(async (
    type: EmailType, 
    orderId: string,
    dispatchData?: DispatchEmailData
  ): Promise<boolean> => {
     setIsLoading(true);
     try {
       const { data, error } = await supabase.functions.invoke("send-email", {
        body: { type, orderId, dispatchData },
       });
 
       if (error) throw error;
 
       if (data?.success) {
         toast.success("Email sent successfully!");
         return true;
       } else {
         throw new Error(data?.error || "Failed to send email");
       }
     } catch (error: unknown) {
       const errorMessage = error instanceof Error ? error.message : "Failed to send email";
       toast.error(errorMessage);
       return false;
     } finally {
       setIsLoading(false);
     }
  }, []);

  // Convenience methods for different email types
  const sendSaleEmail = useCallback(async (orderId: string) => {
    return sendEmail("sale", orderId);
  }, [sendEmail]);

  const sendDispatchEmail = useCallback(async (
    orderId: string, 
    dispatchData?: DispatchEmailData
  ) => {
    return sendEmail("dispatch", orderId, dispatchData);
  }, [sendEmail]);

  const sendTrackingEmail = useCallback(async (orderId: string) => {
    return sendEmail("tracking", orderId);
  }, [sendEmail]);
 
  return { 
    sendEmail, 
    sendSaleEmail,
    sendDispatchEmail,
    sendTrackingEmail,
    isLoading 
  };
 };