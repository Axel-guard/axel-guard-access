import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "DELETE, OPTIONS",
};

const MASTER_EMAIL = "info@axel-guard.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "DELETE") {
    return new Response(JSON.stringify({ success: false, error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.length >= 2 ? parts[parts.length - 1] : url.searchParams.get("id");

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: "Missing id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    console.log("allowed-emails delete request", { id });

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    const { data: userData, error: userError } = await supabaseUser.auth.getUser();
    const user = userData?.user;

    if (userError || !user) {
      console.log("allowed-emails auth failed", userError);
      return new Response(JSON.stringify({ success: false, error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isMaster, error: roleError } = await supabaseUser.rpc("is_master_admin", {
      _user_id: user.id,
    });

    if (roleError) {
      console.log("allowed-emails role check failed", roleError);
      return new Response(JSON.stringify({ success: false, error: "Role check failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!isMaster) {
      return new Response(JSON.stringify({ success: false, error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch target row (also ensures it exists)
    const { data: target, error: targetError } = await supabaseUser
      .from("allowed_emails")
      .select("email")
      .eq("id", id)
      .maybeSingle();

    if (targetError) {
      console.log("allowed-emails target lookup failed", targetError);
      return new Response(JSON.stringify({ success: false, error: "Lookup failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!target) {
      return new Response(JSON.stringify({ success: false, error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((target.email ?? "").toLowerCase() === MASTER_EMAIL.toLowerCase()) {
      return new Response(
        JSON.stringify({ success: false, error: "Master Admin cannot be deleted" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Attempt normal delete (respects RLS)
    const { data: deletedRows, error: deleteError } = await supabaseUser
      .from("allowed_emails")
      .delete()
      .eq("id", id)
      .select("id, email");

    if (!deleteError && (deletedRows?.length ?? 0) > 0) {
      console.log("allowed-emails delete success", { id, deleted: deletedRows?.length });
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If RLS blocks the delete, PostgREST may return 200 with 0 rows deleted (no error)
    console.log("allowed-emails delete did not remove row, attempting force delete", {
      id,
      deleteError: deleteError?.message,
      deleted: deletedRows?.length ?? 0,
    });

    if (!serviceRoleKey) {
      console.log("allowed-emails missing service role key; cannot force delete", { id });
      return new Response(JSON.stringify({ success: false, error: "Delete failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: force delete with service role (still only after Master Admin check)
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    const { data: forcedRows, error: forceError } = await supabaseAdmin
      .from("allowed_emails")
      .delete()
      .eq("id", id)
      .select("id, email");

    if (forceError) {
      console.log("allowed-emails force delete failed", { id, message: forceError.message });
      return new Response(JSON.stringify({ success: false, error: "Delete failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if ((forcedRows?.length ?? 0) === 0) {
      console.log("allowed-emails force delete no-op (not found)", { id });
      return new Response(JSON.stringify({ success: false, error: "Not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("allowed-emails force delete success", { id, deleted: forcedRows?.length });
    return new Response(JSON.stringify({ success: true, forced: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.log("allowed-emails unexpected error", err);
    return new Response(JSON.stringify({ success: false, error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
