-- Fix customer_id foreign keys to reference Lead Database records
DO $$
BEGIN
  ALTER TABLE public.quotations DROP CONSTRAINT IF EXISTS quotations_customer_id_fkey;
  ALTER TABLE public.sales DROP CONSTRAINT IF EXISTS sales_customer_id_fkey;
END $$;

DO $$
BEGIN
  ALTER TABLE public.quotations
    ADD CONSTRAINT quotations_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES public.leads(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE public.sales
    ADD CONSTRAINT sales_customer_id_fkey
    FOREIGN KEY (customer_id)
    REFERENCES public.leads(id)
    ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
