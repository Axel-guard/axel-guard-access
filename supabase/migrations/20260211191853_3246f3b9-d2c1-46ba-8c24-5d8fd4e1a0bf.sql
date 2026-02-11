
-- Add customer_email column to sales table
ALTER TABLE public.sales ADD COLUMN customer_email text;

-- Add customer_email column to quotations table
ALTER TABLE public.quotations ADD COLUMN customer_email text;
