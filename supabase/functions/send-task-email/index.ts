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
  to: string[];
  cc?: string[];
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
    
    // Add all recipients
    for (const to of config.to) {
      await sendCommand(`RCPT TO:<${to}>`);
    }
    if (config.cc) {
      for (const cc of config.cc) {
        await sendCommand(`RCPT TO:<${cc}>`);
      }
    }

    response = await sendCommand("DATA");

    const date = new Date().toUTCString();
    const emailContent = [
      `From: AxelGuard <${config.from}>`,
      `To: ${config.to.join(", ")}`,
      config.cc?.length ? `Cc: ${config.cc.join(", ")}` : null,
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

function getPriorityBadge(priority: string): string {
  const colors: Record<string, string> = {
    Low: "background: #d1fae5; color: #065f46;",
    Normal: "background: #dbeafe; color: #1e40af;",
    High: "background: #fed7aa; color: #9a3412;",
    Urgent: "background: #fecaca; color: #991b1b;",
  };
  return `<span style="display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; ${colors[priority] || colors.Normal}">${priority}</span>`;
}

function getTaskCreatedInternalEmail(task: Record<string, unknown>): { subject: string; body: string } {
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
      <p style="margin: 0;">Priority: ${getPriorityBadge(task.priority as string || "Normal")}</p>
      <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Type: ${task.task_type || "Internal"}</p>
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

function getTaskCreatedCustomerEmail(task: Record<string, unknown>): { subject: string; body: string } {
  return {
    subject: `Regarding Your Request – ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 28px 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">AxelGuard Support</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="color: #374151; font-size: 15px;">Dear ${task.customer_name || "Customer"},</p>
    <p style="color: #374151; line-height: 1.6;">We would like to inform you that a request has been initiated regarding your query.</p>
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <h3 style="margin: 0 0 8px; color: #1e40af;">${task.title}</h3>
      ${task.description ? `<p style="margin: 0; color: #4b5563;">${task.description}</p>` : ""}
    </div>
    <p style="color: #374151; line-height: 1.6;">Our team is currently working on this and will update you shortly.</p>
    <p style="color: #374151; margin-top: 24px;">Best regards,<br><strong>AxelGuard Support Team</strong></p>
  </div>
  <div style="text-align: center; padding: 20px; background: #1f2937; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0; color: #fff; font-weight: 600;">AxelGuard - RealTrack Technology</p>
  </div>
</div>
</body>
</html>`,
  };
}

function getTaskUpdatedInternalEmail(
  task: Record<string, unknown>,
  remarks: string,
  statusChange: string | null,
  updaterName: string
): { subject: string; body: string } {
  const statusBadge = statusChange
    ? `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${
        statusChange === "Completed" || statusChange === "Closed"
          ? "background: #d1fae5; color: #065f46;"
          : statusChange === "In Progress"
          ? "background: #dbeafe; color: #1e40af;"
          : statusChange === "Waiting for Customer"
          ? "background: #fed7aa; color: #9a3412;"
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
      <p style="margin: 0 0 4px; font-weight: 600; color: #374151; font-size: 13px;">Update by ${updaterName}:</p>
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

function getTaskUpdatedCustomerEmail(
  task: Record<string, unknown>,
  remarks: string
): { subject: string; body: string } {
  return {
    subject: `Re: Update Regarding Your Request – ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: linear-gradient(135deg, #059669 0%, #10b981 100%); color: white; padding: 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">AxelGuard Support Update</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="color: #374151; font-size: 15px;">Dear ${task.customer_name || "Customer"},</p>
    <p style="color: #374151; line-height: 1.6;">We would like to inform you about an update regarding your request.</p>
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <p style="margin: 0; color: #374151;">${remarks}</p>
    </div>
    <p style="color: #374151; line-height: 1.6;">Our team is currently working on this and will update you shortly.</p>
    <p style="color: #374151; margin-top: 24px;">Best regards,<br><strong>AxelGuard Support Team</strong></p>
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

    // Get user email
    const getUserEmail = async (userId: string): Promise<string | null> => {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      return userData?.user?.email || null;
    };

    // Get user display name from employees
    const getUserName = async (email: string): Promise<string> => {
      const { data: emp } = await supabase
        .from("employees")
        .select("name")
        .ilike("email", email)
        .maybeSingle();
      return emp?.name || email.split("@")[0];
    };

    // Get admin emails for CC
    const getAdminEmails = async (): Promise<string[]> => {
      const { data: admins } = await supabase
        .from("allowed_emails")
        .select("email, role")
        .in("role", ["admin", "master_admin"]);
      return admins?.map(a => a.email) || [];
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

    const isCustomerTask = task.task_type === "Customer" && task.customer_email_enabled && task.customer_email;
    const adminEmails = await getAdminEmails();

    if (type === "created") {
      // Send internal email to assigned user + creator + admins
      const internalEmail = getTaskCreatedInternalEmail(task);
      const internalRecipients = [assigneeEmail];
      const internalCc = [...new Set([
        ...(creatorEmail && creatorEmail !== assigneeEmail ? [creatorEmail] : []),
        ...adminEmails.filter(e => e !== assigneeEmail && e !== creatorEmail),
      ])];

      await sendSmtpEmail({
        host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
        from: smtpUser, to: internalRecipients, cc: internalCc.length ? internalCc : undefined,
        subject: internalEmail.subject, body: internalEmail.body,
      });

      // If customer email is enabled, send professional email to customer
      if (isCustomerTask) {
        const customerEmailContent = getTaskCreatedCustomerEmail(task);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: [task.customer_email],
          cc: [assigneeEmail, ...(creatorEmail && creatorEmail !== assigneeEmail ? [creatorEmail] : [])],
          subject: customerEmailContent.subject, body: customerEmailContent.body,
        });
      }
    } else if (type === "updated") {
      const updaterName = await getUserName(creatorEmail || assigneeEmail);

      // Internal email
      const internalEmail = getTaskUpdatedInternalEmail(task, remarks || "", statusChange || null, updaterName);
      const internalRecipients = [assigneeEmail];
      const internalCc = [...new Set([
        ...(creatorEmail && creatorEmail !== assigneeEmail ? [creatorEmail] : []),
        ...adminEmails.filter(e => e !== assigneeEmail && e !== creatorEmail),
      ])];

      await sendSmtpEmail({
        host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
        from: smtpUser, to: internalRecipients, cc: internalCc.length ? internalCc : undefined,
        subject: internalEmail.subject, body: internalEmail.body,
      });

      // Customer email if enabled
      if (isCustomerTask) {
        const customerEmailContent = getTaskUpdatedCustomerEmail(task, remarks || "");
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: [task.customer_email],
          cc: [assigneeEmail, ...(creatorEmail && creatorEmail !== assigneeEmail ? [creatorEmail] : [])],
          subject: customerEmailContent.subject, body: customerEmailContent.body,
        });
      }
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
