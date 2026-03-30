import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface CallLog {
  id?: string;
  lead_id?: string | null;
  customer_code?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  call_status: string;   // Connected | Not Connected | Switched Off | Busy
  call_type?: string;    // Incoming | Outgoing
  call_duration?: number;
  disposition?: string | null;  // Interested | Not Interested | Call Back Later | Wrong Number | Converted
  notes?: string | null;
  stage_at_call?: string | null;
  created_at?: string;
}

export interface CreateCallLogData {
  lead_id?: string | null;
  customer_code?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  call_status: string;
  call_type?: string;
  call_duration?: number;
  disposition?: string | null;
  notes?: string | null;
  stage_at_call?: string | null;
  // Follow-up fields (handled separately after creating call log)
  followup_date?: string | null;
  followup_time?: string | null;
  followup_notes?: string | null;
}

export const useCallLogs = (leadId?: string | null, customerCode?: string | null) => {
  return useQuery({
    queryKey: ["call-logs", leadId, customerCode],
    queryFn: async () => {
      let query = supabase
        .from("call_logs")
        .select("*")
        .order("created_at", { ascending: false });

      if (leadId) {
        query = query.eq("lead_id", leadId);
      } else if (customerCode) {
        query = query.eq("customer_code", customerCode);
      } else {
        return [];
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as CallLog[];
    },
    enabled: !!(leadId || customerCode),
  });
};

export const useCreateCallLog = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateCallLogData) => {
      const { followup_date, followup_time, followup_notes, ...callData } = data;

      // Insert call log
      const { data: callLog, error: callError } = await supabase
        .from("call_logs")
        .insert(callData)
        .select()
        .single();

      if (callError) throw callError;

      // Create follow-up if date provided
      if (followup_date) {
        const { error: fuError } = await supabase.from("follow_ups").insert({
          lead_id: data.lead_id || null,
          customer_code: data.customer_code || null,
          call_log_id: callLog.id,
          scheduled_date: followup_date,
          scheduled_time: followup_time || null,
          assigned_to: data.user_name || null,
          notes: followup_notes || null,
          created_by: data.user_name || null,
        });
        if (fuError) console.error("Follow-up creation failed:", fuError);
      }

      // Auto stage movement based on disposition
      if (data.disposition === "Interested" && data.lead_id) {
        await supabase
          .from("leads")
          .update({ pipeline_stage: "Prospect" })
          .eq("id", data.lead_id)
          .eq("pipeline_stage", "Suspect"); // only upgrade, don't downgrade
      }
      if (data.disposition === "Converted" && data.lead_id) {
        await supabase
          .from("leads")
          .update({ pipeline_stage: "Order Done" })
          .eq("id", data.lead_id);
      }

      return callLog;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["call-logs"] });
      queryClient.invalidateQueries({ queryKey: ["follow-ups"] });
      if (variables.lead_id) {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
      }
      toast.success("Call logged successfully!");
    },
    onError: (error: any) => {
      toast.error(`Failed to log call: ${error.message}`);
    },
  });
};
