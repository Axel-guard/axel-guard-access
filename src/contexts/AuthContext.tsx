import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { hardResetSession, redirectToAuth } from "@/lib/authUtils";
import { AuthTimeoutError, isAuthNetworkError, validateAuthConfig, withTimeout } from "@/lib/authNetwork";
import { toast } from "sonner";

type AppRole = "master_admin" | "admin" | "manager" | "user";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  isManager: boolean;
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

    const configValidation = validateAuthConfig();
    if (!configValidation.ok) {
      console.error("[Auth] Invalid auth configuration:", configValidation.message);
      toast.error(configValidation.message);
      hardResetSession().finally(() => {
        clearAuthState();
        redirectToAuth();
      });
      return;
    }

    // FAIL-SAFE: Force stop loading after timeout
    const timeoutId = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn("[Auth] Loading timed out after", AUTH_TIMEOUT_MS, "ms — forcing stop");
          hardResetSession().finally(() => {
            clearAuthState();
            toast.error("Session check timed out. Please login again.");
            redirectToAuth();
          });
        }
        return false;
      });
    }, AUTH_TIMEOUT_MS);

    // Set up auth state listener FIRST
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, currentSession) => {
      console.log("[Auth] onAuthStateChange:", event);

      const eventName = event as string;
      const isTokenRefreshFailure =
        eventName === "TOKEN_REFRESH_FAILED" || (event === "TOKEN_REFRESHED" && !currentSession);

      if (isTokenRefreshFailure) {
        console.warn("[Auth] Token refresh failed — hard resetting session");
        hardResetSession().then(() => {
          clearAuthState();
          clearTimeout(timeoutId);
          toast.error("Session expired. Please login again.");
          redirectToAuth();
        });
        return;
      }

      // Handle SIGNED_OUT explicitly
      if (event === "SIGNED_OUT") {
        clearAuthState();
        clearTimeout(timeoutId);
        redirectToAuth();
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
    });

    // Hard session validation on app start (without blocking health endpoint pre-check)
    withTimeout(supabase.auth.getSession(), 12000, "Session check timed out")
      .then(({ data: { session: existingSession } }) => {
        if (!existingSession) {
          hardResetSession().finally(() => {
            clearAuthState();
            clearTimeout(timeoutId);
            redirectToAuth();
          });
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

        if (err instanceof AuthTimeoutError || isAuthNetworkError(err)) {
          console.warn("[Auth] Network/timeout while checking session");
          toast.error("Network issue. Please check connection.");
        }

        hardResetSession().finally(() => {
          clearAuthState();
          clearTimeout(timeoutId);
          redirectToAuth();
        });
      });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeoutId);
    };
  }, []);

  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    const normalizedEmail = email.toLowerCase().trim();

    // Bootstrap safety for master admin account
    if (normalizedEmail === "info@axel-guard.com") {
      return true;
    }

    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc("is_email_allowed", {
        _email: normalizedEmail,
      });

      if (!rpcError) {
        return Boolean(rpcResult);
      }

      if (isAuthNetworkError(rpcError)) {
        throw rpcError;
      }

      console.error("Error in RPC check:", rpcError);

      // Fallback to table query if RPC is not available
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("id")
        .ilike("email", normalizedEmail)
        .maybeSingle();

      if (error) {
        if (isAuthNetworkError(error)) {
          throw error;
        }

        console.error("Error in table fallback check:", error);
        return false;
      }

      return !!data;
    } catch (err) {
      if (isAuthNetworkError(err)) {
        throw err;
      }

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
    isManager: role === "manager",
    isMasterAdmin: role === "master_admin",
    signOut,
    checkEmailAllowed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
