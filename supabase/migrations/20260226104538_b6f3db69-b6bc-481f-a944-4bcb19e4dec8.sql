
-- Create bulk_qc_requests table for approval workflow
CREATE TABLE public.bulk_qc_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requested_by uuid NOT NULL,
  product_name text NOT NULL,
  qc_value text NOT NULL,
  total_devices integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'Pending',
  approved_by uuid,
  approved_at timestamp with time zone,
  rejected_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bulk_qc_requests ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Authenticated users can view bulk_qc_requests"
  ON public.bulk_qc_requests FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert bulk_qc_requests"
  ON public.bulk_qc_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Master admins can update bulk_qc_requests"
  ON public.bulk_qc_requests FOR UPDATE
  TO authenticated
  USING (is_master_admin(auth.uid()));

CREATE POLICY "Master admins can delete bulk_qc_requests"
  ON public.bulk_qc_requests FOR DELETE
  TO authenticated
  USING (is_master_admin(auth.uid()));

-- Enable realtime for bulk_qc_requests
ALTER PUBLICATION supabase_realtime ADD TABLE public.bulk_qc_requests;
