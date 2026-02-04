import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AppRole = "admin" | "user";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  checkEmailAllowed: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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

  const fetchUserRole = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userId)
        .single();

      if (error) {
        console.error("Error fetching role:", error);
        return null;
      }
      return data?.role as AppRole;
    } catch (err) {
      console.error("Error in fetchUserRole:", err);
      return null;
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetch with setTimeout to avoid deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRole(session.user.id).then(setRole);
          }, 0);
        } else {
          setRole(null);
        }
        
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRole(session.user.id).then(setRole);
      }
      
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkEmailAllowed = async (email: string): Promise<boolean> => {
    try {
      // First check if the allowed_emails table is empty (first-time setup)
      const { count, error: countError } = await supabase
        .from("allowed_emails")
        .select("*", { count: "exact", head: true });

      if (countError) {
        console.error("Error checking email count:", countError);
        // If we can't check, allow login attempt (Supabase will handle auth)
        return true;
      }

      // If no emails in the list, this is the first admin - auto-approve
      if (count === 0) {
        console.log("No approved emails yet - first user will be auto-approved as admin");
        return true;
      }

      // Check if this specific email is in the allowed list
      const { data, error } = await supabase
        .from("allowed_emails")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (error) {
        console.error("Error checking email:", error);
        // If RLS blocks the check, try using RPC function
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

  const signIn = async (email: string, password: string) => {
    try {
      // First check if email is allowed
      const isAllowed = await checkEmailAllowed(email);
      if (!isAllowed) {
        return { error: new Error("Access denied. Your email is not in the approved list.") };
      }

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
      // First check if email is allowed
      const isAllowed = await checkEmailAllowed(email);
      if (!isAllowed) {
        return { error: new Error("Access denied. Your email is not in the approved list.") };
      }

      const redirectUrl = `${window.location.origin}/`;

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      if (error) {
        return { error };
      }

      return { error: null };
    } catch (err) {
      return { error: err as Error };
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
    isAdmin: role === "admin",
    signIn,
    signUp,
    signOut,
    checkEmailAllowed,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
