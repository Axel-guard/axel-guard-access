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

// Base64 encode helper
function toBase64(str: string): string {
  return btoa(str);
}

// Simple SMTP client implementation for Deno Edge Functions
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
}): Promise<void> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  // Connect with TLS (implicit TLS for port 465)
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
    // Read greeting
    let response = await readResponse();
    console.log("SMTP greeting:", response.substring(0, 50));

    // EHLO
    response = await sendCommand("EHLO localhost");
    console.log("EHLO response:", response.substring(0, 50));

    // AUTH LOGIN
    response = await sendCommand("AUTH LOGIN");
    console.log("AUTH response:", response.substring(0, 50));

    // Send username (base64)
    const usernameB64 = toBase64(config.username);
    response = await sendCommand(usernameB64);

    // Send password (base64)
    const passwordB64 = toBase64(config.password);
    response = await sendCommand(passwordB64);

    if (!response.startsWith("235")) {
      throw new Error(`Authentication failed: ${response}`);
    }
    console.log("Authentication successful");

    // MAIL FROM
    response = await sendCommand(`MAIL FROM:<${config.from}>`);
    if (!response.startsWith("250")) {
      throw new Error(`MAIL FROM failed: ${response}`);
    }

    // RCPT TO (recipient)
    response = await sendCommand(`RCPT TO:<${config.to}>`);
    if (!response.startsWith("250")) {
      throw new Error(`RCPT TO failed: ${response}`);
    }

    // RCPT TO (CC)
    if (config.cc) {
      response = await sendCommand(`RCPT TO:<${config.cc}>`);
      if (!response.startsWith("250")) {
        console.warn(`CC recipient failed: ${response}`);
      }
    }

    // DATA
    response = await sendCommand("DATA");
    if (!response.startsWith("354")) {
      throw new Error(`DATA command failed: ${response}`);
    }

    // Build email message
    const date = new Date().toUTCString();
    const emailContent = [
      `From: ${config.from}`,
      `To: ${config.to}`,
      config.cc ? `Cc: ${config.cc}` : null,
      `Subject: ${config.subject}`,
      `Date: ${date}`,
      `Content-Type: text/plain; charset=utf-8`,
      ``,
      config.body,
    ]
      .filter(Boolean)
      .join("\r\n");

    // Send message content followed by terminator
    await writer.write(encoder.encode(emailContent + "\r\n.\r\n"));
    response = await readResponse();

    if (!response.startsWith("250")) {
      throw new Error(`Failed to send email: ${response}`);
    }
    console.log("Message accepted");

    // QUIT
    await sendCommand("QUIT");
  } finally {
    reader.releaseLock();
    writer.releaseLock();
    conn.close();
  }
}

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

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    console.log(`Connecting to SMTP: ${smtpHost}:${smtpPort}`);

    // Send email using custom SMTP implementation
    await sendSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      from: smtpUser,
      to: customerEmail,
      cc: CC_EMAIL,
      subject,
      body,
    });

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