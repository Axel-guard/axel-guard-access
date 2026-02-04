import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const masterEmail = "info@axel-guard.com";
    const masterPassword = "admin123";

    // Check if master admin already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === masterEmail.toLowerCase()
    );

    if (existingUser) {
      // Update password for existing user
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: masterPassword, email_confirm: true }
      );

      if (updateError) {
        console.error("Error updating master admin:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update master admin", details: updateError.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Ensure role is set
      await supabaseAdmin
        .from("allowed_emails")
        .upsert({ email: masterEmail, role: "master_admin" }, { onConflict: "email" });

      await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: existingUser.id, role: "master_admin" }, { onConflict: "user_id,role" });

      return new Response(
        JSON.stringify({ success: true, message: "Master admin updated successfully" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create new master admin user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true,
    });

    if (createError || !newUser.user) {
      console.error("Error creating master admin:", createError);
      return new Response(
        JSON.stringify({ error: "Failed to create master admin", details: createError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Add to allowed_emails
    await supabaseAdmin
      .from("allowed_emails")
      .upsert({ email: masterEmail, role: "master_admin" }, { onConflict: "email" });

    // Add user role
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: newUser.user.id, role: "master_admin" }, { onConflict: "user_id,role" });

    console.log("Master admin created successfully:", masterEmail);

    return new Response(
      JSON.stringify({ success: true, message: "Master admin created successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in setup-master-admin:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
