 import { supabase } from "@/integrations/supabase/client";
 import { toast } from "sonner";
 import { useState } from "react";
 
 type EmailType = "sale" | "dispatch" | "tracking";
 
 export const useEmail = () => {
   const [isLoading, setIsLoading] = useState(false);
 
   const sendEmail = async (type: EmailType, orderId: string) => {
     setIsLoading(true);
     try {
       const { data, error } = await supabase.functions.invoke("send-email", {
         body: { type, orderId },
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
   };
 
   return { sendEmail, isLoading };
 };