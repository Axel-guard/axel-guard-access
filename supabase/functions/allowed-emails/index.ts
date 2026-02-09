import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const VERSION = "v2.0.0";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

const MASTER_EMAIL = "info@axel-guard.com";

serve(async (req) => {
  console.log(`[${VERSION}] allowed-emails request received`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed", _version: VERSION }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.length >= 2 ? parts[parts.length - 1] : url.searchParams.get("id");

    if (!id) {
      console.log(`[${VERSION}] Missing id`);
      return new Response(JSON.stringify({ success: false, error: "Missing id", _version: VERSION }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    console.log(`[${VERSION}] Delete request for id: ${id}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!serviceRoleKey) {
      console.log(`[${VERSION}] Missing service role key`);
      return new Response(JSON.stringify({ success: false, error: "Server configuration error", _version: VERSION }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user client for auth verification
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authHeader } },
    });

    // Create admin client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Verify user authentication
    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      console.log(`[${VERSION}] Auth failed`, userError?.message);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized", _version: VERSION }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${VERSION}] User authenticated: ${user.email}`);

    // Check if user is master admin using admin client (bypasses RLS)
    const { data: isMaster, error: roleError } = await supabaseAdmin.rpc("is_master_admin", {
      _user_id: user.id,
    });

    if (roleError) {
      console.log(`[${VERSION}] Role check failed`, roleError.message);
      return new Response(JSON.stringify({ success: false, error: "Role check failed", _version: VERSION }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${VERSION}] Is master admin: ${isMaster}`);

    if (!isMaster) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden - Master Admin only", _version: VERSION }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch target row using admin client (bypasses RLS)
    const { data: target, error: targetError } = await supabaseAdmin
      .from("allowed_emails")
      .select("id, email, role")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      console.log(`[${VERSION}] Target lookup failed`, targetError.message);
      return new Response(JSON.stringify({ success: false, error: "Lookup failed", _version: VERSION }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target) {
      console.log(`[${VERSION}] Target not found: ${id}`);
      return new Response(JSON.stringify({ success: false, error: "Email not found in database", _version: VERSION }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${VERSION}] Found target: ${target.email} (role: ${target.role})`);

    // Prevent deletion of master admin email
    if ((target.email ?? "").toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      console.log(`[${VERSION}] Cannot delete master admin`);
      return new Response(
        JSON.stringify({ success: false, error: "Master Admin cannot be deleted", _version: VERSION }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Delete using admin client (bypasses RLS)
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("allowed_emails")
      .delete()
      .eq("id", id)
      .select("id, email");

    if (deleteError) {
      console.log(`[${VERSION}] Delete failed`, deleteError.message);
      return new Response(JSON.stringify({ success: false, error: "Delete failed: " + deleteError.message, _version: VERSION }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((deletedRows?.length ?? 0) === 0) {
      console.log(`[${VERSION}] Delete returned 0 rows`);
      return new Response(JSON.stringify({ success: false, error: "Delete operation failed", _version: VERSION }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${VERSION}] Successfully deleted: ${target.email}`);
    return new Response(JSON.stringify({ success: true, deleted: target.email, _version: VERSION }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log(`[${VERSION}] Unexpected error`, err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error", _version: VERSION }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
