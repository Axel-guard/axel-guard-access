import { supabase } from "@/integrations/supabase/client";

type DeleteAllowedEmailResponse = {
  success: boolean;
  forced?: boolean;
  error?: string;
};

export async function deleteAllowedEmail(id: string): Promise<DeleteAllowedEmailResponse> {
  console.log("ALLOWED_EMAILS_DELETE: start", { id });

  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    console.log("ALLOWED_EMAILS_DELETE: no auth token");
    return { success: false, error: "Not authenticated" };
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  if (!baseUrl || !anonKey) {
    console.log("ALLOWED_EMAILS_DELETE: missing env", { hasBaseUrl: !!baseUrl, hasAnonKey: !!anonKey });
    return { success: false, error: "Backend not configured" };
  }

  const url = `${baseUrl}/functions/v1/allowed-emails/${id}`;
  console.log("ALLOWED_EMAILS_DELETE: request", { url });

  const res = await fetch(url, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: anonKey,
      "Content-Type": "application/json",
    },
  });

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  console.log("ALLOWED_EMAILS_DELETE: response", { status: res.status, ok: res.ok, json });

  if (!res.ok) {
    return {
      success: false,
      error: json?.error || `Request failed (${res.status})`,
    };
  }

  return (json || { success: true }) as DeleteAllowedEmailResponse;
}
