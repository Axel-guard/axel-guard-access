import { useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const INACTIVITY_TIMEOUT_MS = 2.5 * 60 * 60 * 1000; // 2.5 hours
const CHECK_INTERVAL_MS = 60 * 1000; // check every minute

const ACTIVITY_EVENTS = [
  "mousedown",
  "mousemove",
  "keydown",
  "scroll",
  "touchstart",
  "click",
] as const;

export const useInactivityLogout = () => {
  const lastActivityRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
  }, []);

  useEffect(() => {
    // Register activity listeners
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, updateActivity, { passive: true });
    }

    // Periodically check inactivity
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      if (elapsed >= INACTIVITY_TIMEOUT_MS) {
        console.warn("[Inactivity] Logging out after", Math.round(elapsed / 60000), "min inactivity");
        toast.info("You have been logged out due to inactivity.");
        supabase.auth.signOut().then(() => {
          window.location.replace("/auth");
        });
      }
    }, CHECK_INTERVAL_MS);

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, updateActivity);
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [updateActivity]);
};
