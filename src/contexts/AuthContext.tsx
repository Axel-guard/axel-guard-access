import { createContext, useContext, useEffect, useState, useRef, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

const AUTH_TIMEOUT_MS = 15000; // 15 seconds max for auth loading

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

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    // FAIL-SAFE: Force stop loading after timeout
    const timeoutId = setTimeout(() => {
      setIsLoading((prev) => {
        if (prev) {
          console.warn("[Auth] Loading timed out after", AUTH_TIMEOUT_MS, "ms — forcing stop");
        }
        return false;
      });
    }, AUTH_TIMEOUT_MS);

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("[Auth] onAuthStateChange:", event);

        // If token refresh failed, clear corrupt session
        if (event === "TOKEN_REFRESHED" && !session) {
          console.warn("[Auth] Token refresh returned no session — clearing");
          supabase.auth.signOut().catch(() => {});
          setUser(null);
          setSession(null);
          setRole(null);
          setIsLoading(false);
          clearTimeout(timeoutId);
          return;
        }

        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
          }, 0);
        } else {
          setRole(null);
        }
        
        setIsLoading(false);
        clearTimeout(timeoutId);
      }
    );

    // THEN check for existing session with try/catch
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserRole(session.user.id).then(setRole);
        }
        
        setIsLoading(false);
        clearTimeout(timeoutId);
      })
      .catch((err) => {
        console.error("[Auth] getSession failed:", err);
        // Clear potentially corrupt session data
        const msg = String(err?.message || "");
        if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("refresh_token")) {
          console.warn("[Auth] Clearing stale session due to network/token error");
          supabase.auth.signOut().catch(() => {});
        }
        setUser(null);
        setSession(null);
        setRole(null);
        setIsLoading(false);
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
