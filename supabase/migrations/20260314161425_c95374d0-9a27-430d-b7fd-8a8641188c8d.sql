
-- Recreate the trigger in case it was lost during migration
DROP TRIGGER IF EXISTS trigger_sync_lead_to_related ON public.leads;
DROP TRIGGER IF EXISTS trigger_sync_lead_to_related_tables ON public.leads;

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
