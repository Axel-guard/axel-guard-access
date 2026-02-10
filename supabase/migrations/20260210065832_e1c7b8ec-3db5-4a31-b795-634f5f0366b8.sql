
-- Create sale_edit_logs table for audit trail
CREATE TABLE public.sale_edit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id TEXT NOT NULL,
  edited_by UUID REFERENCES auth.users(id),
  edit_type TEXT NOT NULL DEFAULT 'update',
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sale_edit_logs ENABLE ROW LEVEL SECURITY;

-- Admins can view all logs
CREATE POLICY "Admins can view edit logs" ON public.sale_edit_logs
FOR SELECT USING (public.is_admin(auth.uid()));

-- Any authenticated user can insert (the app controls who calls it)
CREATE POLICY "Authenticated users can insert edit logs" ON public.sale_edit_logs
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
