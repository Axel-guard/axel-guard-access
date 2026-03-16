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

// Unified email for customer tickets - sent TO customer, CC internal team
function getTicketCustomerEmail(
  task: Record<string, unknown>,
  action: "created" | "updated" | "closed",
  remarks?: string,
  timeline?: Array<{ remarks: string; created_at: string; status_change: string | null; user_name: string }>
): { subject: string; body: string } {
  const isCreated = action === "created";
  const isClosed = action === "closed";

  let headerColor = "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)";
  let headerTitle = "📌 New Ticket Created";
  let mainMessage = "We would like to inform you that a support ticket has been created regarding your query.";

  if (isClosed) {
    headerColor = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
    headerTitle = "✅ Ticket Resolved";
    mainMessage = "We are pleased to inform you that your support ticket has been successfully resolved by our team.";
  } else if (!isCreated) {
    headerColor = "linear-gradient(135deg, #059669 0%, #10b981 100%)";
    headerTitle = "📝 Ticket Update";
    mainMessage = "We would like to inform you about an update regarding your support ticket.";
  }

  const ticketInfoSection = `
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <h3 style="margin: 0 0 8px; color: #1e40af;">${task.title}</h3>
      <p style="margin: 4px 0 0; color: #6b7280; font-size: 13px;">Priority: ${getPriorityBadge(task.priority as string || "Normal")}</p>
      ${task.description && isCreated ? `<p style="margin: 8px 0 0; color: #4b5563;">${task.description}</p>` : ""}
    </div>`;

  const remarksSection = remarks && !isCreated && !isClosed ? `
    <div style="background: #f0fdf4; border-left: 4px solid #10b981; padding: 16px; border-radius: 0 8px 8px 0; margin: 20px 0;">
      <p style="margin: 0; color: #374151;">${remarks}</p>
    </div>` : "";

  const timelineSection = isClosed && timeline ? `
    <h3 style="color: #1e40af; margin: 24px 0 12px;">Activity Timeline</h3>
    <ul style="list-style: none; padding: 0; margin: 0;">
      ${timeline.map((u) => {
        const date = new Date(u.created_at);
        const formatted = `${date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} ${date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}`;
        return `<li style="padding: 8px 0; border-bottom: 1px solid #f3f4f6;">
          <span style="color: #6b7280; font-size: 12px;">${formatted}</span><br>
          <span style="color: #374151;">${u.remarks}</span>
        </li>`;
      }).join("")}
    </ul>` : "";

  const subjectPrefix = isCreated ? "Regarding Your Request" : isClosed ? "Ticket Resolved" : "Re: Update Regarding Your Request";

  return {
    subject: `${subjectPrefix} – ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: ${headerColor}; color: white; padding: 28px 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">${headerTitle}</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  <div style="padding: 28px 24px;">
    <p style="color: #374151; font-size: 15px;">Dear ${task.customer_name || "Customer"},</p>
    <p style="color: #374151; line-height: 1.6;">${mainMessage}</p>
    ${ticketInfoSection}
    ${remarksSection}
    ${timelineSection}
    <p style="color: #374151; line-height: 1.6; margin-top: 24px;">${isClosed ? "If you need any further assistance, please feel free to reach out to us." : "Our team is currently working on this and will update you shortly."}</p>
    <p style="color: #374151; margin-top: 24px;">Best regards,<br><strong>AxelGuard Support Team</strong><br>
    <a href="mailto:info@axel-guard.com" style="color: #3b82f6;">info@axel-guard.com</a></p>
  </div>
  <div style="text-align: center; padding: 20px; background: #1f2937; color: #9ca3af; font-size: 12px;">
    <p style="margin: 0; color: #fff; font-weight: 600;">AxelGuard - RealTrack Technology</p>
  </div>
</div>
</body>
</html>`,
  };
}

// Internal-only email for non-customer tickets or internal-only notifications
function getInternalTicketEmail(
  task: Record<string, unknown>,
  action: "created" | "updated",
  remarks?: string,
  statusChange?: string | null,
  updaterName?: string
): { subject: string; body: string } {
  const isCreated = action === "created";

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

  const statusBadge = statusChange
    ? `<span style="display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; ${
        statusChange === "Closed"
          ? "background: #d1fae5; color: #065f46;"
          : statusChange === "WIP"
          ? "background: #dbeafe; color: #1e40af;"
          : statusChange === "Pending Master Approval"
          ? "background: #e9d5ff; color: #6b21a8;"
          : "background: #fef3c7; color: #92400e;"
      }">${statusChange}</span>`
    : "";

  const headerColor = isCreated ? "linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)" : "linear-gradient(135deg, #059669 0%, #10b981 100%)";
  const headerTitle = isCreated ? "📌 New Ticket Assigned" : "📝 Ticket Update";

  return {
    subject: isCreated ? `New Ticket Assigned: ${task.title}` : `Re: Ticket Update: ${task.title}`,
    body: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f4;">
<div style="max-width: 600px; margin: 0 auto; background: #ffffff;">
  <div style="background: ${headerColor}; color: white; padding: 28px 24px; text-align: center;">
    <h1 style="margin: 0; font-size: 22px;">${headerTitle}</h1>
    <p style="margin: 8px 0 0; opacity: 0.9; font-size: 14px;">RealTrack Technology</p>
  </div>
  <div style="padding: 28px 24px;">
    ${isCreated ? `<p style="color: #374151; margin-bottom: 20px;">A new ticket has been assigned.</p>` : ""}
    <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
      <h2 style="margin: 0 0 8px 0; color: #1e40af; font-size: 18px;">${task.title}</h2>
      ${isCreated ? `<p style="margin: 0;">Priority: ${getPriorityBadge(task.priority as string || "Normal")}</p>` : ""}
      ${statusChange ? `<p style="margin: 8px 0 0;">Status: ${statusBadge}</p>` : ""}
    </div>
    ${!isCreated && remarks ? `
    <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin-bottom: 16px;">
      <p style="margin: 0 0 4px; font-weight: 600; color: #374151; font-size: 13px;">Update by ${updaterName || "Team"}:</p>
      <p style="margin: 0; color: #4b5563;">${remarks}</p>
    </div>` : ""}
    ${isCreated && task.description ? `<div style="margin-bottom: 16px;"><p style="font-weight: 600; color: #374151; margin: 0 0 4px;">Remarks:</p><p style="color: #4b5563; margin: 0;">${task.description}</p></div>` : ""}
    ${isCreated ? customerSection : ""}
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

// Known email→name mapping
const KNOWN_NAMES: Record<string, string> = {
  "info@axel-guard.com": "Akash Parashar",
  "admin@axel-guard.com": "Siddharth Nagaich",
  "support@axel-guard.com": "Pawan Singh",
  "mani@axel-guard.com": "Mandeep Samal",
  "sales.realtrack@gmail.com": "Smruti Ranjan Nayak",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { type, taskId, remarks, statusChange, internalOnly } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: task, error: taskError } = await supabase
      .from("tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error(`Ticket not found: ${taskId}`);
    }

    const getUserEmail = async (userId: string): Promise<string | null> => {
      const { data: userData } = await supabase.auth.admin.getUserById(userId);
      return userData?.user?.email || null;
    };

    const getUserName = async (email: string): Promise<string> => {
      const emailLower = email.toLowerCase();
      if (KNOWN_NAMES[emailLower]) return KNOWN_NAMES[emailLower];
      const { data: emp } = await supabase
        .from("employees")
        .select("name")
        .ilike("email", email)
        .maybeSingle();
      return emp?.name || email.split("@")[0];
    };

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

    const isCustomerTicket = task.task_type === "Customer" && task.customer_email_enabled && task.customer_email;
    const adminEmails = await getAdminEmails();

    // Build CC list: assigned employee, creator, admins (deduplicated)
    const buildCcList = (excludeEmail?: string): string[] => {
      const ccSet = new Set<string>();
      if (assigneeEmail) ccSet.add(assigneeEmail);
      if (creatorEmail) ccSet.add(creatorEmail);
      for (const ae of adminEmails) ccSet.add(ae);
      if (excludeEmail) ccSet.delete(excludeEmail);
      return [...ccSet];
    };

    if (type === "created") {
      if (isCustomerTicket) {
        // Single unified email TO customer, CC internal team
        const email = getTicketCustomerEmail(task, "created");
        const cc = buildCcList(task.customer_email);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: [task.customer_email], cc: cc.length ? cc : undefined,
          subject: email.subject, body: email.body,
        });
      } else {
        // Internal-only ticket: send to assignee, CC creator + admins
        const email = getInternalTicketEmail(task, "created");
        const internalRecipients = [assigneeEmail];
        const cc = buildCcList(assigneeEmail);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: internalRecipients, cc: cc.length ? cc : undefined,
          subject: email.subject, body: email.body,
        });
      }
    } else if (type === "updated") {
      const updaterName = await getUserName(creatorEmail || assigneeEmail);

      if (isCustomerTicket && statusChange !== "Pending Master Approval" && !internalOnly) {
        // Single unified email TO customer, CC internal team
        const email = getTicketCustomerEmail(task, "updated", remarks);
        const cc = buildCcList(task.customer_email);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: [task.customer_email], cc: cc.length ? cc : undefined,
          subject: email.subject, body: email.body,
        });
      } else {
        // Internal-only notification
        const email = getInternalTicketEmail(task, "updated", remarks, statusChange, updaterName);
        const internalRecipients = [assigneeEmail];
        const cc = buildCcList(assigneeEmail);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: internalRecipients, cc: cc.length ? cc : undefined,
          subject: email.subject, body: email.body,
        });
      }
    } else if (type === "closure-approved") {
      if (isCustomerTicket) {
        // Fetch all ticket updates for timeline
        const { data: taskUpdates } = await supabase
          .from("task_updates")
          .select("*")
          .eq("task_id", taskId)
          .order("created_at", { ascending: true });

        const timeline = [];
        const creatorName = creatorEmail ? await getUserName(creatorEmail) : "Unknown";
        timeline.push({
          remarks: "Ticket created",
          created_at: task.created_at,
          status_change: null,
          user_name: creatorName,
        });

        if (taskUpdates) {
          for (const u of taskUpdates) {
            const uEmail = await getUserEmail(u.user_id);
            const uName = uEmail ? await getUserName(uEmail) : "Team";
            timeline.push({
              remarks: u.remarks,
              created_at: u.created_at,
              status_change: u.status_change,
              user_name: uName,
            });
          }
        }

        // Single closure email TO customer, CC entire team
        const closureEmail = getTicketCustomerEmail(task, "closed", undefined, timeline);
        const cc = buildCcList(task.customer_email);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: [task.customer_email], cc: cc.length ? cc : undefined,
          subject: closureEmail.subject, body: closureEmail.body,
        });
      } else {
        // Internal closure notification
        const email = getInternalTicketEmail(task, "updated", "Ticket closure approved. Ticket is now Closed.", "Closed", "Master Admin");
        const internalRecipients = [assigneeEmail];
        const cc = buildCcList(assigneeEmail);
        await sendSmtpEmail({
          host: smtpHost, port: smtpPort, username: smtpUser, password: smtpPass,
          from: smtpUser, to: internalRecipients, cc: cc.length ? cc : undefined,
          subject: email.subject, body: email.body,
        });
      }
    }

    console.log(`Ticket email (${type}) sent for ticket: ${taskId}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error("Error sending ticket email:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
