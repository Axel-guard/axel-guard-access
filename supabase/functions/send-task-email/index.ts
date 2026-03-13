import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
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
    response = await sendCommand("AUTH LOGIN");
    response = await sendCommand(toBase64(config.username));
    response = await sendCommand(toBase64(config.password));

    if (!response.startsWith("235")) {
      throw new Error(`Authentication failed: ${response}`);
    }

    response = await sendCommand(`MAIL FROM:<${config.from}>`);
    response = await sendCommand(`RCPT TO:<${config.to}>`);

    if (config.cc) {
      await sendCommand(`RCPT TO:<${config.cc}>`);
    }

    response = await sendCommand("DATA");

    const date = new Date().toUTCString();
    const emailContent = [
      `From: AxelGuard <${config.from}>`,
      `To: ${config.to}`,
      config.cc ? `Cc: ${config.cc}` : null,
      `Subject: ${config.subject}`,
      `Date: ${date}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
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

    await sendCommand("QUIT");
  } finally {
    reader.releaseLock();
    writer.releaseLock();
    conn.close();
  }
}

function getTaskCreatedEmail(task: Record<string, unknown>, assigneeEmail: string): { subject: string; body: string } {
  const deadline = new Date(task.deadline as string).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  const customerSection = task.customer_code
    ? `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 16px 0;">
      <h3 style="margin: 0 0 12px 0; color: #1e40af; font-size: 14px;">📋 Customer Details</h3>
      <table style="width: 100%; font-size: 14px;">
        <tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Code:</td><td style="font-weight: 600;">${task.customer_code}</td></tr>
        ${task.customer_name ? `<tr><td style="padding: 4px 0; color: #6b7280;">Name:</td><td style="font-weight: 600;">${task.customer_name}</td></tr>` : ""}
        ${task.customer_phone ? `<tr><td style="padding: 4px 0; color: #6b7280;">Phone:</td><td style="font-weight: 600;">${task.customer_phone}</td></tr>` : ""}
        ${task.customer_location ? `<tr><td style="padding: 4px 0; color: #6b7280;">Location:</td><td style="font-weight: 600;">${task.customer_location}</td></tr>` : ""}
        ${task.company_name ? `<tr><td style="padding: 4px 0; color: #6b7280;">Company:</td><td style="font-weight: 600;">${task.company_name}</td></tr>` : ""}
      </table>
    </div>`
    : "";

  return {
    subject: `New Task Assigned: ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 28px 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 24px;">📌 New Task Assigned</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  
  <div style="padding: 28px 24px;">
    <p style="color: #374151; margin-bottom: 20px;">A new task has been assigned to you.</p>
    
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <h2 style="margin: 0 0 8px 0; color: #1e40af; font-size: 18px;">${task.title}</h2>
      <p style="margin: 0; color: #dc2626; font-weight: 600; font-size: 14px;">⏰ Deadline: ${deadline}</p>
    </div>
    
    ${task.description ? `<div style="margin-bottom: 16px;"><p style="font-weight: 600; color: #374151; margin: 0 0 4px;">Remarks:</p><p style="color: #4b5563; margin: 0;">${task.description}</p></div>` : ""}
    
    ${customerSection}
  </div>
  
  <div style="text-align: center; padding: 20px; background: #1f2937; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0; color: #fff; font-weight: 600;">AxelGuard - RealTrack Technology</p>
    <p style="margin: 4px 0 0;">This is an automated notification.</p>
  </div>
</div>
</body>
</html>`,
  };
}

function getTaskUpdatedEmail(
  task: Record<string, unknown>,
  remarks: string,
  statusChange: string | null,
  updaterEmail: string
): { subject: string; body: string } {
  const statusBadge = statusChange
    ? `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${
        statusChange === "Completed"
          ? "background: #d1fae5; color: #065f46;"
          : statusChange === "In Progress"
          ? "background: #dbeafe; color: #1e40af;"
          : "background: #fef3c7; color: #92400e;"
      }">${statusChange}</span>`
    : "";

  return {
    subject: `Re: Task Update: ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">📝 Task Update</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  
  <div style="padding: 28px 24px;">
    <h2 style="margin: 0 0 16px; color: #1e40af; font-size: 18px;">${task.title}</h2>
    
    ${statusChange ? `<p style="margin-bottom: 16px;">Status changed to: ${statusBadge}</p>` : ""}
    
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px; font-weight: 600; color: #374151; font-size: 13px;">Update by ${updaterEmail}:</p>
      <p style="margin: 0; color: #4b5563;">${remarks}</p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; background: #1f2937; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0; color: #fff; font-weight: 600;">AxelGuard - RealTrack Technology</p>
  </div>
</div>
</body>
</html>`,
  };
}

function getReminderEmail(task: Record<string, unknown>): { subject: string; body: string } {
  const deadline = new Date(task.deadline as string).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return {
    subject: `⏰ Task Deadline Reminder: ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">⏰ Deadline Approaching</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  
  <div style="padding: 28px 24px;">
    <p style="color: #374151;">Reminder: Your assigned task deadline is approaching. Please update or complete the task.</p>
    
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <h2 style="margin: 0 0 8px 0; color: #dc2626; font-size: 18px;">${task.title}</h2>
      <p style="margin: 0; font-weight: 600; color: #991b1b;">Deadline: ${deadline}</p>
    </div>
  </div>
  
  <div style="text-align: center; padding: 20px; background: #1f2937; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0; color: #fff; font-weight: 600;">AxelGuard - RealTrack Technology</p>
  </div>
</div>
</body>
</html>`,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, taskId, remarks, statusChange } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch the task
    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Task not found: ${taskId}`);
    }

    // Get emails for creator and assignee from allowed_emails via user_roles
    const getUserEmail = async (userId: string): Promise<string | null> => {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (!role) return null;

      // Try to find email from auth.users
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      return userData?.user?.email || null;
    };

    const creatorEmail = await getUserEmail(task.created_by);
    const assigneeEmail = await getUserEmail(task.assigned_to);

    if (!assigneeEmail) {
      console.warn("Assignee email not found, skipping email");
      return new Response(
        JSON.stringify({ success: true, message: "No email found for assignee" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const smtpHost = Deno.env.get("SMTP_HOST") || "smtp.gmail.com";
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "465");
    const smtpUser = Deno.env.get("SMTP_USER")!;
    const smtpPass = Deno.env.get("SMTP_PASS")!;

    let subject: string;
    let body: string;

    if (type === "created") {
      const email = getTaskCreatedEmail(task, assigneeEmail);
      subject = email.subject;
      body = email.body;

      await sendSmtpEmail({
        host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
        from: smtpUser, to: assigneeEmail, cc: creatorEmail || undefined,
        subject, body,
      });
    } else if (type === "updated") {
      const updaterEmail = creatorEmail || assigneeEmail;
      const email = getTaskUpdatedEmail(task, remarks || "", statusChange || null, updaterEmail);
      subject = email.subject;
      body = email.body;

      // Send to both creator and assignee
      const recipients = [creatorEmail, assigneeEmail].filter(Boolean) as string[];
      const primaryTo = recipients[0];
      const cc = recipients.length > 1 ? recipients[1] : undefined;

      await sendSmtpEmail({
        host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
        from: smtpUser, to: primaryTo, cc,
        subject, body,
      });
    } else if (type === "reminder") {
      const email = getReminderEmail(task);
      subject = email.subject;
      body = email.body;

      await sendSmtpEmail({
        host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
        from: smtpUser, to: assigneeEmail,
        subject, body,
      });
    }

    console.log(`Task email (${type}) sent for task: ${taskId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error sending task email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
