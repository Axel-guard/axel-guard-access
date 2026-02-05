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
   dispatchData?: {
     dispatchDate?: string;
     serialNumbers?: string[];
     productName?: string;
     totalQuantity?: number;
   };
 }
 
 const CC_EMAIL = "mani@axel-guard.com";
 
 const formatCurrency = (amount: number) =>
   `₹${amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
 
 const getEmailTemplate = (
   type: string,
   data: Record<string, unknown>
 ): { subject: string; body: string } => {
   switch (type) {
     case "sale":
       return {
         subject: `Order Confirmation - ${data.orderId} | AxelGuard`,
         body: `<!DOCTYPE html>
 <html>
 <head>
   <meta charset="utf-8">
   <style>
     body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
     .container { max-width: 600px; margin: 0 auto; }
     .header { background: linear-gradient(135deg, #1e40af, #3b82f6); color: white; padding: 30px 20px; text-align: center; }
     .content { background: #f9fafb; padding: 30px 20px; }
     .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
     .section-title { font-weight: bold; color: #1e40af; margin-bottom: 15px; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; font-size: 16px; }
     .info-row { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
     .label { color: #6b7280; font-size: 14px; }
     .value { font-weight: 600; color: #111827; }
     .amount-grid { margin: 20px 0; }
     .amount-box { text-align: center; padding: 20px; margin: 10px 0; border-radius: 8px; }
     .total { background: #1e40af; color: white; }
     .received { background: #10b981; color: white; }
     .balance { background: #ef4444; color: white; }
     .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f3f4f6; }
     .logo { font-size: 28px; font-weight: bold; }
     .amount-label { font-size: 12px; opacity: 0.9; }
     .amount-value { font-size: 22px; font-weight: bold; margin-top: 5px; }
   </style>
 </head>
 <body>
   <div class="container">
     <div class="header">
       <div class="logo">🛡️ AxelGuard</div>
       <h2 style="margin: 15px 0 0 0; font-weight: 500;">Order Confirmation</h2>
     </div>
     <div class="content">
       <p style="font-size: 16px;">Hello <strong>${data.customerName || "Customer"}</strong>,</p>
       <p>Thank you for choosing AxelGuard. Your order has been successfully created in our system.</p>
       
       <div class="section">
         <div class="section-title">📦 Order Details</div>
         <div class="info-row"><span class="label">Order ID:</span> <span class="value">${data.orderId}</span></div>
         <div class="info-row"><span class="label">Order Date:</span> <span class="value">${data.saleDate}</span></div>
       </div>
       
       <div class="section">
         <div class="section-title">🛒 Products Ordered</div>
         <div style="white-space: pre-line; color: #374151;">${data.products}</div>
       </div>
       
       <div class="amount-grid">
         <div class="amount-box total">
           <div class="amount-label">Total Order Value</div>
           <div class="amount-value">${formatCurrency(data.totalAmount as number)}</div>
         </div>
         <div class="amount-box received">
           <div class="amount-label">Amount Received</div>
           <div class="amount-value">${formatCurrency(data.amountReceived as number)}</div>
         </div>
         <div class="amount-box balance">
           <div class="amount-label">Outstanding Balance</div>
           <div class="amount-value">${formatCurrency(data.balanceAmount as number)}</div>
         </div>
       </div>
       
       <p style="margin-top: 20px;">Our team is reviewing your order and will process it shortly. You will receive dispatch notification soon.</p>
     </div>
     <div class="footer">
       <p style="margin: 0 0 10px 0;"><strong>Warm regards,</strong><br>AxelGuard Team</p>
       <p style="margin: 0;">📧 Support: info@axel-guard.com | 🌐 www.axel-guard.com</p>
     </div>
   </div>
 </body>
 </html>`,
       };
 
     case "dispatch":
       const serialNumbersHtml = (data.serialNumbers as string[])?.length > 0
         ? `<div class="section">
             <div class="section-title">🔢 Serial Numbers</div>
             <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 13px;">
               ${(data.serialNumbers as string[]).map((sn: string) => `<span style="display: inline-block; background: #10b981; color: white; padding: 5px 12px; border-radius: 20px; font-size: 12px; margin: 3px;">${sn}</span>`).join("")}
             </div>
           </div>`
         : "";
 
       return {
         subject: `Order Dispatched - ${data.orderId} | AxelGuard`,
         body: `<!DOCTYPE html>
 <html>
 <head>
   <meta charset="utf-8">
   <style>
     body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
     .container { max-width: 600px; margin: 0 auto; }
     .header { background: linear-gradient(135deg, #059669, #10b981); color: white; padding: 30px 20px; text-align: center; }
     .content { background: #f9fafb; padding: 30px 20px; }
     .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
     .section-title { font-weight: bold; color: #059669; margin-bottom: 15px; border-bottom: 2px solid #10b981; padding-bottom: 8px; font-size: 16px; }
     .info-row { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
     .label { color: #6b7280; font-size: 14px; }
     .value { font-weight: 600; color: #111827; }
     .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f3f4f6; }
     .logo { font-size: 28px; font-weight: bold; }
     .qc-badge { background: #10b981; color: white; padding: 12px 24px; border-radius: 6px; display: inline-block; font-weight: 600; }
   </style>
 </head>
 <body>
   <div class="container">
     <div class="header">
       <div class="logo">🚚 AxelGuard</div>
       <h2 style="margin: 15px 0 0 0; font-weight: 500;">Order Dispatched</h2>
     </div>
     <div class="content">
       <p style="font-size: 16px;">Hello <strong>${data.customerName || "Customer"}</strong>,</p>
       <p>Great news! Your order has been dispatched and is on its way to you.</p>
       
       <div class="section">
         <div class="section-title">📦 Dispatch Information</div>
         <div class="info-row"><span class="label">Order ID:</span> <span class="value">${data.orderId}</span></div>
         <div class="info-row"><span class="label">Dispatch Date:</span> <span class="value">${data.dispatchDate}</span></div>
       </div>
       
       <div class="section">
         <div class="section-title">📋 Packed Product Details</div>
         <div class="info-row"><span class="label">Product Name:</span> <span class="value">${data.productName || "N/A"}</span></div>
         <div class="info-row"><span class="label">Quantity Dispatched:</span> <span class="value">${data.totalQuantity || 0} units</span></div>
       </div>
       
       ${serialNumbersHtml}
       
       <div style="text-align: center; margin: 25px 0;">
         <span class="qc-badge">✅ All devices passed quality checks</span>
       </div>
       
       <p>Courier & tracking details will be shared soon.</p>
     </div>
     <div class="footer">
       <p style="margin: 0 0 10px 0;"><strong>Warm regards,</strong><br>AxelGuard Team</p>
       <p style="margin: 0;">📧 Support: info@axel-guard.com | 🌐 www.axel-guard.com</p>
     </div>
   </div>
 </body>
 </html>`,
       };
 
     case "tracking":
       return {
         subject: `Tracking Details - Order ${data.orderId} | AxelGuard`,
         body: `<!DOCTYPE html>
 <html>
 <head>
   <meta charset="utf-8">
   <style>
     body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
     .container { max-width: 600px; margin: 0 auto; }
     .header { background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 30px 20px; text-align: center; }
     .content { background: #f9fafb; padding: 30px 20px; }
     .section { background: white; padding: 20px; margin: 15px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
     .section-title { font-weight: bold; color: #7c3aed; margin-bottom: 15px; border-bottom: 2px solid #a78bfa; padding-bottom: 8px; font-size: 16px; }
     .info-row { padding: 10px 0; border-bottom: 1px solid #f0f0f0; }
     .label { color: #6b7280; font-size: 14px; }
     .value { font-weight: 600; color: #111827; }
     .tracking-highlight { background: linear-gradient(135deg, #7c3aed, #a78bfa); color: white; padding: 25px; border-radius: 8px; text-align: center; margin: 20px 0; }
     .tracking-number { font-size: 28px; font-weight: bold; letter-spacing: 2px; margin-top: 10px; }
     .footer { text-align: center; padding: 30px 20px; color: #6b7280; font-size: 13px; background: #f3f4f6; }
     .logo { font-size: 28px; font-weight: bold; }
     .status-badge { background: #fbbf24; color: #78350f; padding: 10px 20px; border-radius: 6px; display: inline-block; font-weight: bold; }
   </style>
 </head>
 <body>
   <div class="container">
     <div class="header">
       <div class="logo">📍 AxelGuard</div>
       <h2 style="margin: 15px 0 0 0; font-weight: 500;">Tracking Details</h2>
     </div>
     <div class="content">
       <p style="font-size: 16px;">Hello <strong>${data.customerName || "Customer"}</strong>,</p>
       <p>Your order is on the way! Here are your shipment tracking details.</p>
       
       <div class="tracking-highlight">
         <div style="font-size: 14px; opacity: 0.9;">🚚 AWB / Tracking Number</div>
         <div class="tracking-number">${data.trackingId || "Pending"}</div>
       </div>
       
       <div class="section">
         <div class="section-title">📦 Shipment Details</div>
         <div class="info-row"><span class="label">Order ID:</span> <span class="value">${data.orderId}</span></div>
         <div class="info-row"><span class="label">Courier Partner:</span> <span class="value">${data.courier || "N/A"}</span></div>
         <div class="info-row"><span class="label">Shipping Mode:</span> <span class="value">${data.mode || "N/A"}</span></div>
       </div>
       
       <div style="text-align: center; margin: 25px 0;">
         <span class="status-badge">📦 In Transit</span>
       </div>
       
       <p>Contact us if you have any questions about your delivery.</p>
     </div>
     <div class="footer">
       <p style="margin: 0 0 10px 0;"><strong>Warm regards,</strong><br>AxelGuard Team</p>
       <p style="margin: 0;">📧 Support: info@axel-guard.com | 🌐 www.axel-guard.com</p>
     </div>
   </div>
 </body>
 </html>`,
       };
 
     default:
       throw new Error(`Unknown email type: ${type}`);
   }
 };
 
 function toBase64(str: string): string {
   return btoa(str);
 }
 
 async function sendSmtpEmail(config: {
   host: string;
   port: number;
   username: string;
   password: string;
   from: string;
   to: string;
   cc?: string;
   subject: string;
   body: string;
   isHtml?: boolean;
 }): Promise<void> {
   const encoder = new TextEncoder();
   const decoder = new TextDecoder();
 
   const conn = await Deno.connectTls({
     hostname: config.host,
     port: config.port,
   });
 
   const reader = conn.readable.getReader();
   const writer = conn.writable.getWriter();
 
   async function readResponse(): Promise<string> {
     const result = await reader.read();
     if (result.done) throw new Error("Connection closed");
     return decoder.decode(result.value);
   }
 
   async function sendCommand(cmd: string): Promise<string> {
     await writer.write(encoder.encode(cmd + "\r\n"));
     return await readResponse();
   }
 
   try {
     let response = await readResponse();
     console.log("SMTP greeting:", response.substring(0, 50));
 
     response = await sendCommand("EHLO localhost");
     console.log("EHLO response:", response.substring(0, 50));
 
     response = await sendCommand("AUTH LOGIN");
     console.log("AUTH response:", response.substring(0, 50));
 
     const usernameB64 = toBase64(config.username);
     response = await sendCommand(usernameB64);
 
     const passwordB64 = toBase64(config.password);
     response = await sendCommand(passwordB64);
 
     if (!response.startsWith("235")) {
       throw new Error(`Authentication failed: ${response}`);
     }
     console.log("Authentication successful");
 
     response = await sendCommand(`MAIL FROM:<${config.from}>`);
     if (!response.startsWith("250")) {
       throw new Error(`MAIL FROM failed: ${response}`);
     }
 
     response = await sendCommand(`RCPT TO:<${config.to}>`);
     if (!response.startsWith("250")) {
       throw new Error(`RCPT TO failed: ${response}`);
     }
 
     if (config.cc) {
       response = await sendCommand(`RCPT TO:<${config.cc}>`);
       if (!response.startsWith("250")) {
         console.warn(`CC recipient failed: ${response}`);
       }
     }
 
     response = await sendCommand("DATA");
     if (!response.startsWith("354")) {
       throw new Error(`DATA command failed: ${response}`);
     }
 
     const date = new Date().toUTCString();
     const contentType = config.isHtml ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
     
     const emailContent = [
       `From: AxelGuard <${config.from}>`,
       `To: ${config.to}`,
       config.cc ? `Cc: ${config.cc}` : null,
       `Subject: ${config.subject}`,
       `Date: ${date}`,
       `MIME-Version: 1.0`,
       `Content-Type: ${contentType}`,
       ``,
       config.body,
     ]
       .filter(Boolean)
       .join("\r\n");
 
     await writer.write(encoder.encode(emailContent + "\r\n.\r\n"));
     response = await readResponse();
 
     if (!response.startsWith("250")) {
       throw new Error(`Failed to send email: ${response}`);
     }
     console.log("Message accepted");
 
     await sendCommand("QUIT");
   } finally {
     reader.releaseLock();
     writer.releaseLock();
     conn.close();
   }
 }
 
 async function sendEmailWithRetry(
   config: Parameters<typeof sendSmtpEmail>[0],
   maxRetries: number = 2
 ): Promise<void> {
   let lastError: Error | null = null;
   
   for (let attempt = 1; attempt <= maxRetries; attempt++) {
     try {
       console.log(`Email attempt ${attempt}/${maxRetries}`);
       await sendSmtpEmail(config);
       console.log(`Email sent successfully on attempt ${attempt}`);
       return;
     } catch (error) {
       lastError = error as Error;
       console.error(`Attempt ${attempt} failed:`, error);
       
       if (attempt < maxRetries) {
         await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
       }
     }
   }
   
   throw lastError || new Error("Failed to send email after retries");
 }
 
 serve(async (req) => {
   if (req.method === "OPTIONS") {
     return new Response("ok", { headers: corsHeaders });
   }
 
   try {
     const { type, orderId, dispatchData }: EmailRequest = await req.json();
 
     if (!type || !orderId) {
       throw new Error("Missing required fields: type and orderId");
     }
 
     console.log(`Processing ${type} email for order: ${orderId}`);
 
     const supabase = createClient(
       Deno.env.get("SUPABASE_URL")!,
       Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
     );
 
     const { data: sale, error: saleError } = await supabase
       .from("sales")
       .select("*")
       .eq("order_id", orderId)
       .single();
 
     if (saleError || !sale) {
       throw new Error(`Sale not found for order ID: ${orderId}`);
     }
 
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
 
     const { data: saleItems } = await supabase
       .from("sale_items")
       .select("product_name, quantity")
       .eq("order_id", orderId);
 
     const productsList = saleItems
       ?.map((item) => `${item.product_name} x ${item.quantity}`)
       .join("\n") || "N/A";
 
     let emailData: Record<string, unknown> = {
       orderId,
       customerName: sale.customer_name,
       products: productsList,
       totalAmount: Number(sale.total_amount) || 0,
       amountReceived: Number(sale.amount_received) || 0,
       balanceAmount: Number(sale.balance_amount) || 0,
       saleDate: new Date(sale.sale_date).toLocaleDateString("en-IN"),
     };
 
     if (type === "dispatch") {
       let serialNumbers: string[] = dispatchData?.serialNumbers || [];
       
       if (serialNumbers.length === 0) {
         const { data: inventoryItems } = await supabase
           .from("inventory")
           .select("serial_number")
           .eq("order_id", orderId)
           .eq("status", "Dispatched");
         
         serialNumbers = inventoryItems?.map(i => i.serial_number) || [];
       }
       
       const productName = dispatchData?.productName || 
         saleItems?.map(i => i.product_name).join(", ") || "N/A";
       
       const totalQuantity = dispatchData?.totalQuantity || 
         saleItems?.reduce((sum, i) => sum + i.quantity, 0) || 0;
       
       emailData = {
         ...emailData,
         dispatchDate: dispatchData?.dispatchDate || new Date().toLocaleDateString("en-IN"),
         serialNumbers,
         productName,
         totalQuantity,
       };
     }
     
     if (type === "tracking") {
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
       };
     }
 
     const { subject, body } = getEmailTemplate(type, emailData);
 
     console.log(`Sending email to: ${customerEmail}, CC: ${CC_EMAIL}`);
 
     const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
     const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
     const smtpUser = Deno.env.get("SMTP_USER")!;
     const smtpPass = Deno.env.get("SMTP_PASS")!;
 
     console.log(`Connecting to SMTP: ${smtpHost}:${smtpPort}`);
 
     await sendEmailWithRetry({
       host: smtpHost,
       port: smtpPort,
       username: smtpUser,
       password: smtpPass,
       from: smtpUser,
       to: customerEmail,
       cc: CC_EMAIL,
       subject,
       body,
       isHtml: true,
     }, 2);
 
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