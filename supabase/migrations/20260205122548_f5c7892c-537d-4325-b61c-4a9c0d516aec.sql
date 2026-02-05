-- Add approval workflow columns to quotations
ALTER TABLE public.quotations
ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS created_role text,
ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS approved_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS rejected_reason text;

-- Create email_logs table to track quotation emails
CREATE TABLE IF NOT EXISTS public.email_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    quotation_id uuid REFERENCES public.quotations(id) ON DELETE CASCADE,
    sent_by uuid REFERENCES auth.users(id),
    sent_at timestamp with time zone NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'Sent',
    recipient_email text,
    error_message text
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policy for email_logs
CREATE POLICY "Allow all access to email_logs" ON public.email_logs
FOR ALL USING (true) WITH CHECK (true);

-- Update quotation status default for approval workflow
COMMENT ON COLUMN public.quotations.status IS 'Status values: Draft, Pending Approval, Approved, Rejected, Converted, Sent';