-- Add invoice and eway bill URL columns to sales table
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_url text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS eway_bill_url text;

-- Create storage bucket for sale documents
INSERT INTO storage.buckets (id, name, public) 
VALUES ('sale-documents', 'sale-documents', true)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for sale-documents bucket
CREATE POLICY "Authenticated users can upload sale documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'sale-documents');

CREATE POLICY "Anyone can view sale documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'sale-documents');

CREATE POLICY "Authenticated users can update sale documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'sale-documents');

CREATE POLICY "Authenticated users can delete sale documents"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'sale-documents');