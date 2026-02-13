
-- Add product_type column to products table
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS product_type text NOT NULL DEFAULT 'physical';

-- Set all existing "Services" category products to service type
UPDATE public.products SET product_type = 'service' WHERE LOWER(category) = 'services';
