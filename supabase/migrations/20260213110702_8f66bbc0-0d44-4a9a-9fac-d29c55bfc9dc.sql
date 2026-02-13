
-- Add renewal_applicable flag to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS renewal_applicable boolean NOT NULL DEFAULT false;

-- Set TRUE for the 5 specified renewal products
UPDATE public.products SET renewal_applicable = true 
WHERE product_name IN (
  'MDVR Software Licence Fee',
  'MDVR Server Maintenance Charges', 
  'Cloud Storage Service',
  'Annual Maintenance Charges',
  'Website Hosting'
);
