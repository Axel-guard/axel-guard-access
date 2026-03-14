import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Listens to realtime changes on leads and sales tables,
 * then invalidates all related queries so every tab stays in sync.
 */
export const useRealtimeSync = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel("global-sync")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "leads" },
        () => {
          // A lead was updated → refresh all views that display customer info
          queryClient.invalidateQueries({ queryKey: ["leads"] });
          queryClient.invalidateQueries({ queryKey: ["all-sales"] });
          queryClient.invalidateQueries({ queryKey: ["all-sales-balance"] });
          queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
          queryClient.invalidateQueries({ queryKey: ["customer-search"] });
          queryClient.invalidateQueries({ queryKey: ["customer-orders"] });
          queryClient.invalidateQueries({ queryKey: ["payment-history-with-sales"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sales" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["all-sales"] });
          queryClient.invalidateQueries({ queryKey: ["all-sales-balance"] });
          queryClient.invalidateQueries({ queryKey: ["current-month-sales"] });
          queryClient.invalidateQueries({ queryKey: ["sales"] });
          queryClient.invalidateQueries({ queryKey: ["sales-with-items"] });
          queryClient.invalidateQueries({ queryKey: ["dashboard-summary"] });
          queryClient.invalidateQueries({ queryKey: ["payment-history-with-sales"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
