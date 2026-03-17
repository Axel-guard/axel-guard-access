import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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
  subject: string;
  body: string;
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
    await readResponse(); // greeting
    await sendCommand("EHLO localhost");
    await sendCommand("AUTH LOGIN");
    await sendCommand(toBase64(config.username));
    const authResp = await sendCommand(toBase64(config.password));
    if (!authResp.startsWith("235")) throw new Error(`Auth failed: ${authResp}`);

    let resp = await sendCommand(`MAIL FROM:<${config.from}>`);
    if (!resp.startsWith("250")) throw new Error(`MAIL FROM failed: ${resp}`);

    resp = await sendCommand(`RCPT TO:<${config.to}>`);
    if (!resp.startsWith("250")) throw new Error(`RCPT TO failed: ${resp}`);

    resp = await sendCommand("DATA");
    if (!resp.startsWith("354")) throw new Error(`DATA failed: ${resp}`);

    const emailContent = [
      `From: AxelGuard <${config.from}>`,
      `To: ${config.to}`,
      `Subject: ${config.subject}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      ``,
      config.body,
    ].join("\r\n");

    await writer.write(encoder.encode(emailContent + "\r\n.\r\n"));
    resp = await readResponse();
    if (!resp.startsWith("250")) throw new Error(`Send failed: ${resp}`);

    await sendCommand("QUIT");
  } finally {
    reader.releaseLock();
    writer.releaseLock();
    conn.close();
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, action } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (action === "verify") {
      // Verify OTP
      const { otp } = await req.json();
      // This path is handled client-side via RPC, not here
      throw new Error("Use client-side verification");
    }

    // Generate 6-digit OTP
    const otpCode = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 min expiry

    // Invalidate any existing unused OTPs for this email
    await supabase
      .from("otp_verifications")
      .update({ used: true })
      .eq("email", email.toLowerCase())
      .eq("used", false);

    // Insert new OTP
    const { error: insertError } = await supabase
      .from("otp_verifications")
      .insert({
        email: email.toLowerCase(),
        otp_code: otpCode,
        expires_at: expiresAt,
        used: false,
        attempts: 0,
      });

    if (insertError) {
      console.error("Failed to store OTP:", insertError);
      throw new Error("Failed to generate OTP");
    }

    // Send OTP email
    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    const emailBody = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background-color: #f4f4f4;">
  <div style="max-width: 500px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 32px 24px; text-align: center;">
      <div style="font-size: 28px; font-weight: 700;">🛡️ AxelGuard</div>
      <div style="font-size: 16px; margin-top: 8px; opacity: 0.9;">Login Verification</div>
    </div>
    <div style="padding: 32px 24px; text-align: center;">
      <p style="color: #4b5563; font-size: 15px; margin-bottom: 24px;">
        Your one-time password for login verification:
      </p>
      <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 12px; padding: 20px; margin: 0 auto; max-width: 280px;">
        <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1e40af; font-family: monospace;">
          ${otpCode}
        </div>
      </div>
      <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
        This code expires in <strong>10 minutes</strong>.<br>
        Do not share this code with anyone.
      </p>
    </div>
    <div style="text-align: center; padding: 20px 24px; background: #1f2937; color: #9ca3af; font-size: 12px;">
      <div style="color: #ffffff; font-weight: 600; margin-bottom: 4px;">AxelGuard Security</div>
      If you didn't request this code, please ignore this email.
    </div>
  </div>
</body>
</html>`;

    await sendSmtpEmail({
      host: smtpHost,
      port: smtpPort,
      username: smtpUser,
      password: smtpPass,
      from: smtpUser,
      to: email.toLowerCase(),
      subject: `${otpCode} - Your AxelGuard Login OTP`,
      body: emailBody,
    });

    console.log(`OTP sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true, message: "OTP sent successfully" }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("OTP error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
