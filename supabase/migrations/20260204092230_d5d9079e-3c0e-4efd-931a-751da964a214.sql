-- Ensure info@axel-guard.com is always in allowed_emails as master_admin
INSERT INTO public.allowed_emails (email, role)
VALUES ('info@axel-guard.com', 'master_admin')
ON CONFLICT (email) DO UPDATE SET role = 'master_admin';

-- Create a trigger to prevent downgrading the master admin email
CREATE OR REPLACE FUNCTION public.protect_master_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Prevent deletion of master admin email
  IF TG_OP = 'DELETE' AND LOWER(OLD.email) = 'info@axel-guard.com' THEN
    RAISE EXCEPTION 'Cannot delete the master admin email';
  END IF;
  
  -- Prevent role change for master admin email
  IF TG_OP = 'UPDATE' AND LOWER(OLD.email) = 'info@axel-guard.com' THEN
    IF NEW.role != 'master_admin' THEN
      RAISE EXCEPTION 'Cannot change the role of master admin';
    END IF;
    IF LOWER(NEW.email) != 'info@axel-guard.com' THEN
      RAISE EXCEPTION 'Cannot change the master admin email address';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Drop existing trigger if exists and create new one
DROP TRIGGER IF EXISTS protect_master_admin_trigger ON public.allowed_emails;
CREATE TRIGGER protect_master_admin_trigger
BEFORE UPDATE OR DELETE ON public.allowed_emails
FOR EACH ROW
EXECUTE FUNCTION public.protect_master_admin_email();

-- Create function to check if user is master admin by email
CREATE OR REPLACE FUNCTION public.is_master_admin_email(_email text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT LOWER(_email) = 'info@axel-guard.com'
$$;