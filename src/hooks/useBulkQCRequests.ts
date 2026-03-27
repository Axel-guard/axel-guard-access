import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createNotification } from "@/hooks/useNotifications";

export interface BulkQCRequest {
  id: string;
  requested_by: string;
  product_name: string;
  qc_value: string;
  total_devices: number;
  status: string;
  approved_by: string | null;
  approved_at: string | null;
  rejected_reason: string | null;
  created_at: string;
  updated_at: string;
}

export const useBulkQCRequests = () => {
  return useQuery({
    queryKey: ["bulk-qc-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bulk_qc_requests")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as BulkQCRequest[];
    },
  });
};

export const useCreateBulkQCRequest = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      product_name,
      qc_value,
      total_devices,
    }: {
      product_name: string;
      qc_value: string;
      total_devices: number;
    }) => {
      if (!user) throw new Error("Not authenticated");

      const { data, error } = await supabase
        .from("bulk_qc_requests")
        .insert({
          requested_by: user.id,
          product_name,
          qc_value,
          total_devices,
          status: "Pending",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bulk-qc-requests"] });
      toast({
        title: "Bulk QC Request Submitted",
        description: `Request to apply ${data.qc_value} to ${data.total_devices} ${data.product_name} devices sent for approval.`,
      });
      createNotification(
        "Bulk QC Request",
        `Bulk QC request: Apply "${data.qc_value}" to ${data.total_devices} ${data.product_name} devices. Awaiting approval.`,
        "bulk_qc",
        { request_id: data.id, product_name: data.product_name, qc_value: data.qc_value },
        "/bulk-qc-approvals",
        data.id
      ).catch(console.error);
    },
    onError: (error: any) => {
      toast({
        title: "Request Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useApproveBulkQC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (requestId: string) => {
      // 1. Get the request
      const { data: request, error: fetchError } = await supabase
        .from("bulk_qc_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;
      if (!request) throw new Error("Request not found");
      if (request.status !== "Pending") throw new Error("Request already processed");

      // 2. Bulk update inventory — only pending QC devices of same product
      const { error: updateError, count } = await supabase
        .from("inventory")
        .update({
          qc_result: request.qc_value,
          qc_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("product_name", request.product_name)
        .or("qc_result.eq.Pending,qc_result.is.null");

      if (updateError) throw updateError;

      // 3. Mark request as approved
      const { error: approveError } = await supabase
        .from("bulk_qc_requests")
        .update({
          status: "Approved",
          approved_by: user?.id,
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (approveError) throw approveError;

      return { request, updatedCount: count };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bulk-qc-requests"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      toast({
        title: "Bulk QC Approved",
        description: `Applied "${data.request.qc_value}" to ${data.request.product_name} pending devices.`,
      });
      // Notify requester
      supabase
        .from("notifications")
        .insert({
          user_id: data.request.requested_by,
          title: "Bulk QC Approved",
          message: `Your bulk QC request for ${data.request.product_name} (${data.request.qc_value}) has been approved.`,
          type: "bulk_qc",
          metadata: { request_id: data.request.id } as any,
          route: "/quality-check",
        })
        .then(() => {});
    },
    onError: (error: any) => {
      toast({
        title: "Approval Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useRejectBulkQC = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      requestId,
      reason,
    }: {
      requestId: string;
      reason: string;
    }) => {
      const { data: request, error: fetchError } = await supabase
        .from("bulk_qc_requests")
        .select("*")
        .eq("id", requestId)
        .single();

      if (fetchError) throw fetchError;
      if (request.status !== "Pending") throw new Error("Request already processed");

      const { error } = await supabase
        .from("bulk_qc_requests")
        .update({
          status: "Rejected",
          rejected_reason: reason,
          updated_at: new Date().toISOString(),
        })
        .eq("id", requestId);

      if (error) throw error;

      // Notify requester
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: request.requested_by,
          title: "Bulk QC Rejected",
          message: `Your bulk QC request for ${request.product_name} was rejected. Reason: ${reason}`,
          type: "bulk_qc",
          metadata: { request_id: requestId } as any,
          route: "/quality-check",
        });
      if (notifError) console.error("Notification error:", notifError);

      return request;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["bulk-qc-requests"] });
      toast({
        title: "Request Rejected",
        description: `Bulk QC request for ${data.product_name} has been rejected.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rejection Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};

export const useMasterAdminBulkApply = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      product_name,
      qc_value,
    }: {
      product_name: string;
      qc_value: string;
    }) => {
      const { error, count } = await supabase
        .from("inventory")
        .update({
          qc_result: qc_value,
          qc_date: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("product_name", product_name)
        .or("qc_result.eq.Pending,qc_result.is.null");

      if (error) throw error;
      return { count, product_name, qc_value };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary"] });
      toast({
        title: "Bulk QC Applied",
        description: `Applied "${data.qc_value}" to ${data.product_name} pending devices.`,
      });

      createNotification(
        "Bulk QC Applied",
        `Master Admin applied "${data.qc_value}" to all pending ${data.product_name} devices (${data.count || 0} updated).`,
        "bulk_qc",
        { product_name: data.product_name, qc_value: data.qc_value, count: data.count, event: "bulk_qc_applied" },
        "/quality-check"
      ).catch(console.error);
    },
    onError: (error: any) => {
      toast({
        title: "Bulk Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
};
