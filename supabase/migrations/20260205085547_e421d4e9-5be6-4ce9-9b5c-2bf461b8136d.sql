-- Add description and unit columns to quotation_items for enhanced product details
ALTER TABLE public.quotation_items 
ADD COLUMN IF NOT EXISTS description text,
ADD COLUMN IF NOT EXISTS unit text DEFAULT 'Pcs';