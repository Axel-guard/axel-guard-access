import { supabase } from "@/integrations/supabase/client";

/**
 * Hard-reset: clears all auth state, storage, and reloads.
 * Use when token refresh fails or session is irrecoverable.
 */
export const hardResetSession = async () => {
  console.warn("[Auth] Hard resetting session");
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore — we're clearing anyway
  }
  // Remove all supabase keys from storage
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") || key.includes("supabase")) {
      localStorage.removeItem(key);
    }
  }
  for (const key of Object.keys(sessionStorage)) {
    if (key.startsWith("sb-") || key.includes("supabase")) {
      sessionStorage.removeItem(key);
    }
  }
};

/**
 * Hard-reset + full page reload (for manual "Reset Session" button).
 */
export const hardResetAndReload = async () => {
  await hardResetSession();
  window.location.replace("/auth");
};
