 import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
 import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
 
 const corsHeaders = {
   "Access-Control-Allow-Origin": "*",
   "Access-Control-Allow-Headers":
     "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
 };
 
 interface EmailRequest {
   type: "sale" | "dispatch" | "tracking";
   orderId: string;
 }
 
 const CC_EMAIL = "mani@axel-guard.com";
 
 const getEmailTemplate = (
   type: string,
   data: Record<string, unknown>
 ): { subject: string; body: string } => {
   const formatCurrency = (amount: number) =>
     `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
 
   switch (type) {
     case "sale":
       return {
         subject: "Sale Confirmation – AxelGuard",
         body: `Hello ${data.customerName || "Customer"},
 
 Thank you for your purchase with AxelGuard.
 
 Your sale has been successfully created.
 
 Order Details:
 ---------------------
 Order ID: ${data.orderId}
 Date: ${data.saleDate}
 Products: ${data.products}
 Total Amount: ${formatCurrency(data.totalAmount as number)}
 Received: ${formatCurrency(data.amountReceived as number)}
 Balance: ${formatCurrency(data.balanceAmount as number)}
 ---------------------
 
 Our team will process your order shortly.
 
 Regards,
 AxelGuard Team
 Support: info@axel-guard.com`,
       };
 
     case "dispatch":
       return {
         subject: "Order Dispatched – AxelGuard",
         body: `Hello ${data.customerName || "Customer"},
 
 Your order has been dispatched.
 
 Dispatch Details:
 ---------------------
 Order ID: ${data.orderId}
 Courier: ${data.courier || "N/A"}
 Mode: ${data.mode || "N/A"}
 Tracking ID: ${data.trackingId || "N/A"}
 Dispatch Date: ${data.dispatchDate}
 ---------------------
 
 You can track your shipment using the tracking ID.
 
 Regards,
 AxelGuard Team
 Support: info@axel-guard.com`,
       };
 
     case "tracking":
       return {
         subject: "Tracking Update – AxelGuard",
         body: `Hello ${data.customerName || "Customer"},
 
 Tracking update for your order:
 
 Order ID: ${data.orderId}
 Tracking ID: ${data.trackingId || "N/A"}
 Courier: ${data.courier || "N/A"}
 Mode: ${data.mode || "N/A"}
 Status: In Transit
 
 Thank you for choosing AxelGuard.
 
 Regards,
 AxelGuard Team
 Support: info@axel-guard.com`,
       };
 
     default:
       throw new Error(`Unknown email type: ${type}`);
   }
 };
 
 serve(async (req) => {
   // Handle CORS preflight requests
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const { type, orderId }: EmailRequest = await req.json();
 
     if (!type || !orderId) {
       throw new Error("Missing required fields: type and orderId");
     }
 
     console.log(`Processing ${type} email for order: ${orderId}`);
 
     // Initialize Supabase client
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     // Fetch sale data
     const { data: sale, error: saleError } = await supabase
       .from("sales")
       .select("*")
       .eq("order_id", orderId)
       .single();
 
     if (saleError || !sale) {
       throw new Error(`Sale not found for order ID: ${orderId}`);
     }
 
     // Get customer email from leads table
     let customerEmail = null;
     if (sale.customer_code) {
       const { data: lead } = await supabase
         .from("leads")
         .select("email")
         .eq("customer_code", sale.customer_code)
         .single();
       customerEmail = lead?.email;
     }
 
     if (!customerEmail) {
       throw new Error("Customer email not found. Please update customer details with email.");
     }
 
     // Fetch sale items
     const { data: saleItems } = await supabase
       .from("sale_items")
       .select("product_name, quantity")
       .eq("order_id", orderId);
 
     const productsList = saleItems
       ?.map((item) => `${item.product_name} x ${item.quantity}`)
       .join(", ") || "N/A";
 
     // Build email data based on type
     let emailData: Record<string, unknown> = {
       orderId,
       customerName: sale.customer_name,
       products: productsList,
       totalAmount: Number(sale.total_amount) || 0,
       amountReceived: Number(sale.amount_received) || 0,
       balanceAmount: Number(sale.balance_amount) || 0,
       saleDate: new Date(sale.sale_date).toLocaleDateString("en-IN"),
     };
 
     // For dispatch/tracking, get shipment data
     if (type === "dispatch" || type === "tracking") {
       const { data: shipment } = await supabase
         .from("shipments")
         .select("*")
         .eq("order_id", orderId)
         .order("created_at", { ascending: false })
         .limit(1)
         .single();
 
       emailData = {
         ...emailData,
         courier: shipment?.courier_partner,
         mode: shipment?.shipping_mode,
         trackingId: shipment?.tracking_id,
         dispatchDate: shipment?.created_at
           ? new Date(shipment.created_at).toLocaleDateString("en-IN")
           : new Date().toLocaleDateString("en-IN"),
       };
     }
 
     // Get email template
     const { subject, body } = getEmailTemplate(type, emailData);
 
     console.log(`Sending email to: ${customerEmail}, CC: ${CC_EMAIL}`);
 
      // Use Resend API for reliable email delivery
      const resendApiKey = Deno.env.get("RESEND_API_KEY");
      
      if (!resendApiKey) {
        throw new Error("RESEND_API_KEY is not configured");
      }

      // For production, you need to verify your domain at resend.com/domains
      // For testing, Resend only allows sending to the account owner's email
      const fromEmail = "AxelGuard <onboarding@resend.dev>";

      const resendResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: fromEmail,
          to: [customerEmail],
          cc: [CC_EMAIL],
          subject,
          text: body,
        }),
      });

      const resendResult = await resendResponse.json();

      if (!resendResponse.ok) {
        console.error("Resend API error:", resendResult);
        throw new Error(resendResult.message || "Failed to send email");
      }

     console.log(`Email sent successfully for order: ${orderId}`);
 
     return new Response(
       JSON.stringify({ success: true, message: "Email sent successfully" }),
       {
         status: 200,
         headers: { "Content-Type": "application/json", ...corsHeaders },
       }
     );
   } catch (error) {
     console.error("Error sending email:", error);
     return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
       {
         status: 500,
         headers: { "Content-Type": "application/json", ...corsHeaders },
       }
     );
   }
 });