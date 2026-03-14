
-- Function to sync lead data to sales and customers tables
CREATE OR REPLACE FUNCTION public.sync_lead_to_related_tables()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Update sales table where customer_code matches
  UPDATE public.sales
  SET 
    customer_name = NEW.customer_name,
    company_name = NEW.company_name,
    customer_contact = NEW.mobile_number,
    customer_email = NEW.email
  WHERE customer_code = NEW.customer_code;

  -- Update customers table where customer_code matches
  UPDATE public.customers
  SET 
    customer_name = NEW.customer_name,
    company_name = NEW.company_name,
    mobile_number = NEW.mobile_number,
    email = NEW.email,
    gst_number = NEW.gst_number,
    complete_address = NEW.complete_address,
    updated_at = now()
  WHERE customer_code = NEW.customer_code;

  RETURN NEW;
END;
$$;

-- Create trigger on leads table
CREATE TRIGGER trigger_sync_lead_to_related
  AFTER UPDATE ON public.leads
  FOR EACH ROW
  WHEN (
    OLD.customer_name IS DISTINCT FROM NEW.customer_name OR
    OLD.company_name IS DISTINCT FROM NEW.company_name OR
    OLD.mobile_number IS DISTINCT FROM NEW.mobile_number OR
    OLD.email IS DISTINCT FROM NEW.email OR
    OLD.gst_number IS DISTINCT FROM NEW.gst_number OR
    OLD.complete_address IS DISTINCT FROM NEW.complete_address
  )
  EXECUTE FUNCTION public.sync_lead_to_related_tables();

-- Enable realtime for leads and sales tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.sales;
