import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { Resend } from "https://esm.sh/resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

interface OTPRequest {
  email: string;
  action: "send" | "verify";
  otp?: string;
}

// Generate a 6-digit random OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { email, action, otp }: OTPRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if email is in allowed list
    const { data: allowedEmail, error: allowedError } = await supabaseAdmin
      .from("allowed_emails")
      .select("email, role")
      .ilike("email", normalizedEmail)
      .maybeSingle();

    if (allowedError) {
      console.error("Error checking allowed email:", allowedError);
      return new Response(
        JSON.stringify({ error: "Failed to verify email access" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check first-time setup: if no emails exist and this is the master admin
    const { count: emailCount } = await supabaseAdmin
      .from("allowed_emails")
      .select("*", { count: "exact", head: true });

    const isMasterAdmin = normalizedEmail === "info@axel-guard.com";

    // Master admin is ALWAYS allowed - this is a permanent system rule
    if (isMasterAdmin) {
      // Ensure master admin is in the allowed list with correct role
      await supabaseAdmin
        .from("allowed_emails")
        .upsert({ 
          email: normalizedEmail, 
          role: "master_admin" 
        }, { 
          onConflict: "email" 
        });
    } else if (!allowedEmail && emailCount !== 0) {
      // Non-master admin not in allowed list
      return new Response(
        JSON.stringify({ error: "Access denied. Your email is not in the approved list." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "send") {
      // Clean up old OTPs for this email
      await supabaseAdmin
        .from("otp_verifications")
        .delete()
        .eq("email", normalizedEmail);

      // Generate new OTP
      const otpCode = generateOTP();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

      // Store OTP in database
      const { error: insertError } = await supabaseAdmin
        .from("otp_verifications")
        .insert({
          email: normalizedEmail,
          otp_code: otpCode,
          expires_at: expiresAt.toISOString(),
          attempts: 0,
          used: false,
        });

      if (insertError) {
        console.error("Error storing OTP:", insertError);
        return new Response(
          JSON.stringify({ error: "Failed to generate OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Send OTP via email
      // Note: Update the 'from' address once your domain is verified in Resend
      const { error: emailError } = await resend.emails.send({
        from: "AxelGuard <onboarding@resend.dev>",
        to: [normalizedEmail],
        subject: "Your Login OTP Code - AxelGuard",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: #ffffff; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <div style="text-align: center; margin-bottom: 32px;">
                <h1 style="color: #1f2937; font-size: 24px; font-weight: 700; margin: 0;">AxelGuard</h1>
                <p style="color: #6b7280; font-size: 14px; margin-top: 8px;">Secure Access Portal</p>
              </div>
              
              <h2 style="color: #1f2937; font-size: 20px; text-align: center; margin-bottom: 24px;">Your One-Time Password</h2>
              
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1f2937; font-family: monospace;">${otpCode}</span>
              </div>
              
              <p style="color: #6b7280; text-align: center; font-size: 14px; margin-bottom: 16px;">
                This code will expire in <strong>5 minutes</strong>.
              </p>
              
              <p style="color: #9ca3af; text-align: center; font-size: 12px;">
                If you didn't request this code, please ignore this email.
              </p>
            </div>
            
            <p style="color: #9ca3af; text-align: center; font-size: 11px; margin-top: 24px;">
              &copy; ${new Date().getFullYear()} AxelGuard. All rights reserved.
            </p>
          </body>
          </html>
        `,
      });

      if (emailError) {
        console.error("Error sending email:", emailError);
        return new Response(
          JSON.stringify({ error: "Failed to send OTP email. Please try again." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`OTP sent to ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ success: true, message: "OTP sent successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else if (action === "verify") {
      if (!otp) {
        return new Response(
          JSON.stringify({ error: "OTP is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Get the OTP record
      const { data: otpRecord, error: otpError } = await supabaseAdmin
        .from("otp_verifications")
        .select("*")
        .eq("email", normalizedEmail)
        .eq("used", false)
        .gte("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (otpError) {
        console.error("Error fetching OTP:", otpError);
        return new Response(
          JSON.stringify({ error: "Failed to verify OTP" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!otpRecord) {
        return new Response(
          JSON.stringify({ error: "OTP expired or not found. Please request a new one." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check max attempts (3)
      if (otpRecord.attempts >= 3) {
        // Mark as used to prevent further attempts
        await supabaseAdmin
          .from("otp_verifications")
          .update({ used: true })
          .eq("id", otpRecord.id);

        return new Response(
          JSON.stringify({ error: "Too many failed attempts. Please request a new OTP." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Verify OTP
      if (otpRecord.otp_code !== otp) {
        // Increment attempts
        await supabaseAdmin
          .from("otp_verifications")
          .update({ attempts: otpRecord.attempts + 1 })
          .eq("id", otpRecord.id);

        const remainingAttempts = 2 - otpRecord.attempts;
        return new Response(
          JSON.stringify({ 
            error: `Invalid OTP. ${remainingAttempts > 0 ? `${remainingAttempts} attempt(s) remaining.` : "Please request a new OTP."}` 
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // OTP is valid - mark as used
      await supabaseAdmin
        .from("otp_verifications")
        .update({ used: true })
        .eq("id", otpRecord.id);

      // Check if user exists in auth.users
      const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user (first-time login)
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
        });

        if (createError || !newUser.user) {
          console.error("Error creating user:", createError);
          return new Response(
            JSON.stringify({ error: "Failed to create user account" }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }

        userId = newUser.user.id;
      }

      // Ensure master admin always has master_admin role
      if (isMasterAdmin) {
        await supabaseAdmin
          .from("user_roles")
          .upsert({ 
            user_id: userId, 
            role: "master_admin" 
          }, { 
            onConflict: "user_id,role" 
          });
      }

      // Generate a magic link for the user to sign in
      const { data: magicLink, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: "magiclink",
        email: normalizedEmail,
      });

      if (linkError || !magicLink) {
        console.error("Error generating magic link:", linkError);
        return new Response(
          JSON.stringify({ error: "Failed to generate login session" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Extract token from magic link
      const url = new URL(magicLink.properties.action_link);
      const token = url.searchParams.get("token");
      const type = url.searchParams.get("type");

      console.log(`OTP verified for ${normalizedEmail}`);
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP verified successfully",
          token,
          type,
          email: normalizedEmail
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );

    } else {
      return new Response(
        JSON.stringify({ error: "Invalid action" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in send-otp function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
