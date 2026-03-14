
-- Add new columns to tasks table
ALTER TABLE public.tasks 
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'Normal',
  ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'Internal',
  ADD COLUMN IF NOT EXISTS customer_email text,
  ADD COLUMN IF NOT EXISTS customer_email_enabled boolean NOT NULL DEFAULT false;

-- Make deadline nullable (remove requirement)
ALTER TABLE public.tasks ALTER COLUMN deadline DROP NOT NULL;
ALTER TABLE public.tasks ALTER COLUMN deadline SET DEFAULT null;

-- Add attachment columns to task_updates
ALTER TABLE public.task_updates 
  ADD COLUMN IF NOT EXISTS attachment_url text,
  ADD COLUMN IF NOT EXISTS attachment_name text;

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('task-attachments', 'task-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload task attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'task-attachments');

CREATE POLICY "Anyone can view task attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'task-attachments');

CREATE POLICY "Authenticated users can delete task attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'task-attachments');
