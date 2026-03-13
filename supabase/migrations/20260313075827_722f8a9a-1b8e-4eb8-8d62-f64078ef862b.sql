
-- Tasks table
CREATE TABLE public.tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  customer_code text,
  customer_name text,
  customer_phone text,
  customer_location text,
  company_name text,
  deadline timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'Pending',
  created_by uuid NOT NULL,
  assigned_to uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  completed_at timestamp with time zone,
  email_thread_id text
);

-- Task updates / activity log
CREATE TABLE public.task_updates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  remarks text NOT NULL,
  status_change text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_updates ENABLE ROW LEVEL SECURITY;

-- Tasks RLS: visible to creator, assignee, admin, master_admin
CREATE POLICY "Users can view their own tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_to 
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Authenticated users can create tasks"
  ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Task participants can update tasks"
  ON public.tasks FOR UPDATE TO authenticated
  USING (
    auth.uid() = created_by 
    OR auth.uid() = assigned_to 
    OR public.is_admin(auth.uid())
  );

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE TO authenticated
  USING (public.is_admin(auth.uid()));

-- Task updates RLS
CREATE POLICY "Task participants can view updates"
  ON public.task_updates FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id 
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

CREATE POLICY "Task participants can add updates"
  ON public.task_updates FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_id 
      AND (t.created_by = auth.uid() OR t.assigned_to = auth.uid() OR public.is_admin(auth.uid()))
    )
  );

-- Updated_at trigger for tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
