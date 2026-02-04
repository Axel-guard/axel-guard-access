-- Add customer fields for quotation->sale mapping
ALTER TABLE public.quotations
  ADD COLUMN IF NOT EXISTS customer_code text,
  ADD COLUMN IF NOT EXISTS customer_id uuid;

ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS customer_id uuid;

-- Foreign keys (idempotent)
DO $$
BEGIN
  ALTER TABLE public.quotations
    ADD CONSTRAINT quotations_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES public.customers(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.sales
    ADD CONSTRAINT sales_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES public.customers(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_quotations_customer_code ON public.quotations(customer_code);
CREATE INDEX IF NOT EXISTS idx_quotations_customer_id ON public.quotations(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_customer_id ON public.sales(customer_id);
