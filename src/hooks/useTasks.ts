import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface Task {
  id: string;
  title: string;
  description: string | null;
  customer_code: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_location: string | null;
  company_name: string | null;
  customer_email: string | null;
  deadline: string | null;
  status: string;
  priority: string;
  task_type: string;
  customer_email_enabled: boolean;
  created_by: string;
  assigned_to: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  email_thread_id: string | null;
}

export interface TaskUpdate {
  id: string;
  task_id: string;
  user_id: string;
  remarks: string;
  status_change: string | null;
  attachment_url: string | null;
  attachment_name: string | null;
  created_at: string;
}

export interface CreateTaskData {
  title: string;
  description?: string;
  customer_code?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_location?: string;
  company_name?: string;
  customer_email?: string;
  priority?: string;
  task_type?: string;
  customer_email_enabled?: boolean;
  deadline?: string;
  assigned_to: string;
}

export const useTasks = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Task[];
    },
    enabled: !!user,
  });
};

export const useTaskUpdates = (taskId: string) => {
  return useQuery({
    queryKey: ["task_updates", taskId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("task_updates")
        .select("*")
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data as TaskUpdate[];
    },
    enabled: !!taskId,
  });
};

export const useCreateTask = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (data: CreateTaskData) => {
      const { data: task, error } = await supabase
        .from("tasks")
        .insert({
          ...data,
          created_by: user!.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Send email notification
      try {
        await supabase.functions.invoke("send-task-email", {
          body: { type: "created", taskId: task.id },
        });
      } catch (e) {
        console.error("Failed to send task email:", e);
      }

      return task;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task created successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create task");
    },
  });
};

export const useAddTaskUpdate = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      taskId,
      remarks,
      statusChange,
      attachmentUrl,
      attachmentName,
      internalOnly,
    }: {
      taskId: string;
      remarks: string;
      statusChange?: string;
      attachmentUrl?: string;
      attachmentName?: string;
      internalOnly?: boolean;
    }) => {
      // Insert update
      const { error: updateError } = await supabase
        .from("task_updates")
        .insert({
          task_id: taskId,
          user_id: user!.id,
          remarks,
          status_change: statusChange || null,
          attachment_url: attachmentUrl || null,
          attachment_name: attachmentName || null,
        });

      if (updateError) throw updateError;

      // Update task status if changed
      if (statusChange) {
        const updateData: Record<string, unknown> = { status: statusChange };
        if (statusChange === "Closed") {
          updateData.completed_at = new Date().toISOString();
        }
        const { error: taskError } = await supabase
          .from("tasks")
          .update(updateData)
          .eq("id", taskId);

        if (taskError) throw taskError;
      }

      // Send email notification
      try {
        await supabase.functions.invoke("send-task-email", {
          body: { type: "updated", taskId, remarks, statusChange, internalOnly: internalOnly || false },
        });
      } catch (e) {
        console.error("Failed to send task update email:", e);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      queryClient.invalidateQueries({ queryKey: ["task_updates", variables.taskId] });
      toast.success("Task updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update task");
    },
  });
};

export const uploadTaskAttachment = async (file: File): Promise<{ url: string; name: string }> => {
  const fileExt = file.name.split(".").pop();
  const fileName = `${crypto.randomUUID()}.${fileExt}`;
  const filePath = `attachments/${fileName}`;

  const { error } = await supabase.storage
    .from("task-attachments")
    .upload(filePath, file);

  if (error) throw error;

  const { data: urlData } = supabase.storage
    .from("task-attachments")
    .getPublicUrl(filePath);

  return { url: urlData.publicUrl, name: file.name };
};
