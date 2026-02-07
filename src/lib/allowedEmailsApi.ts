import { supabase } from "@/integrations/supabase/client";

type DeleteAllowedEmailResponse = {
  success: boolean;
  forced?: boolean;
  error?: string;
};

export async function deleteAllowedEmail(id: string): Promise<DeleteAllowedEmailResponse> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  if (!token) {
    return { success: false, error: "Not authenticated" };
  }

  const baseUrl = import.meta.env.VITE_SUPABASE_URL;
  const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

  const res = await fetch(`${baseUrl}/functions/v1/allowed-emails/${id}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
        "Content-Type": "application/json",
      },
    }
  );

  let json: any = null;
  try {
    json = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    return {
      success: false,
      error: json?.error || `Request failed (${res.status})`,
    };
  }

  return (json || { success: true }) as DeleteAllowedEmailResponse;
}
