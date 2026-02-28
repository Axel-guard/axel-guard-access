import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hardResetSession } from "@/lib/authUtils";
import { toast } from "sonner";

type AppRole = "master_admin" | "admin" | "user";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isMasterAdmin: boolean;
  signOut: () => Promise<void>;
  checkEmailAllowed: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 15000;

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const initializedRef = useRef(false);

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching role:", error);
        return null;
      }
      return data?.role as AppRole | null;
    } catch (err) {
      console.error("Error in fetchUserRole:", err);
      return null;
    }
  };

  /** Detect if an error is a network / fetch failure */
  const isNetworkError = (err: unknown): boolean => {
    const msg = String((err as any)?.message || err || "");
    return (
      msg.includes("Failed to fetch") ||
      msg.includes("NetworkError") ||
      msg.includes("refresh_token") ||
      msg.includes("AuthRetryableFetchError")
    );
  };

  /** Clear auth state (does NOT reload) */
  const clearAuthState = () => {
    setUser(null);
    setSession(null);
    setRole(null);
    setIsLoading(false);
  };

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // FAIL-SAFE: Force stop loading after timeout
    const timeoutId = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn("[Auth] Loading timed out after", AUTH_TIMEOUT_MS, "ms — forcing stop");
          // If still loading after timeout, clear stale tokens
          hardResetSession();
        }
        return false;
      });
    }, AUTH_TIMEOUT_MS);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("[Auth] onAuthStateChange:", event);

        // 2️⃣ GLOBAL TOKEN REFRESH FAILURE HANDLER
        if (event === "TOKEN_REFRESHED" && !currentSession) {
          console.warn("[Auth] Token refresh returned no session — hard resetting");
          hardResetSession().then(() => {
            clearAuthState();
            clearTimeout(timeoutId);
            toast.error("Session expired. Please login again.");
          });
          return;
        }

        // Handle SIGNED_OUT explicitly
        if (event === "SIGNED_OUT") {
          clearAuthState();
          clearTimeout(timeoutId);
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (currentSession?.user) {
          setTimeout(() => {
            fetchUserRole(currentSession.user.id).then(setRole);
          }, 0);
        } else {
          setRole(null);
        }

        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    );

    // 1️⃣ HARD SESSION VALIDATION ON APP START
    supabase.auth.getSession()
      .then(({ data: { session: existingSession } }) => {
        if (!existingSession) {
          // No session — just stop loading, let login page show
          clearAuthState();
          clearTimeout(timeoutId);
          return;
        }

        setSession(existingSession);
        setUser(existingSession.user);

        fetchUserRole(existingSession.user.id).then(setRole);

        setIsLoading(false);
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        console.error("[Auth] getSession failed:", err);

        // 3️⃣ NETWORK FAILURE GUARD — don't retry, just clear
        if (isNetworkError(err)) {
          console.warn("[Auth] Clearing stale session due to network/token error");
          hardResetSession();
          toast.error("Network error. Session cleared. Please login again.");
        }

        clearAuthState();
        clearTimeout(timeoutId);
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    try {
      const { count, error: countError } = await supabase
        .from("allowed_emails")
        .select("*", { count: "exact", head: true });

      if (countError) {
        console.error("Error checking email count:", countError);
        return true;
      }

      if (count === 0 && email.toLowerCase() === "info@axel-guard.com") {
        return true;
      }

      const { data, error } = await supabase
        .from("allowed_emails")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (error) {
        const { data: rpcResult, error: rpcError } = await supabase
          .rpc("is_email_allowed", { _email: email });

        if (rpcError) {
          console.error("Error in RPC check:", rpcError);
          return false;
        }

        return rpcResult as boolean;
      }

      return !!data;
    } catch (err) {
      console.error("Error in checkEmailAllowed:", err);
      return false;
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setRole(null);
  };

  const value: AuthContextType = {
    user,
    session,
    role,
    isLoading,
    isAdmin: role === "admin" || role === "master_admin",
    isMasterAdmin: role === "master_admin",
    signOut,
    checkEmailAllowed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
