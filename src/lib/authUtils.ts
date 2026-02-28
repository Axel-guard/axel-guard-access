import { supabase } from "@/integrations/supabase/client";

interface HardResetSessionOptions {
  clearAllStorage?: boolean;
}

/**
 * Remove Supabase-related keys from browser storage.
 */
const clearSupabaseStorageKeys = () => {
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
 * Hard-reset: clears auth state and storage.
 * Use when token refresh fails or session is irrecoverable.
 */
export const hardResetSession = async ({ clearAllStorage = false }: HardResetSessionOptions = {}) => {
  console.warn("[Auth] Hard resetting session");

  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    // ignore — we're clearing anyway
  }

  if (clearAllStorage) {
    localStorage.clear();
    sessionStorage.clear();
    return;
  }

  clearSupabaseStorageKeys();
};

/**
 * Redirect users to auth route safely.
 */
export const redirectToAuth = () => {
  if (window.location.pathname !== "/auth") {
    window.location.replace("/auth");
  }
};

/**
 * Manual recovery: clear all local data and reload app.
 */
export const hardResetAndReload = async () => {
  await hardResetSession({ clearAllStorage: true });
  window.location.reload();
};
