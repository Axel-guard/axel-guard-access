-- Fix the protect_master_admin_email trigger function
-- The bug: returns NEW for DELETE, but NEW is NULL on DELETE operations
-- This causes PostgreSQL to skip the delete entirely
CREATE OR REPLACE FUNCTION public.protect_master_admin_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Prevent deletion of master admin email
  IF TG_OP = 'DELETE' THEN
    IF LOWER(OLD.email) = 'info@axel-guard.com' THEN
      RAISE EXCEPTION 'Cannot delete the master admin email';
    END IF;
    -- For DELETE, return OLD to allow the deletion to proceed
    RETURN OLD;
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
  
  -- For UPDATE/INSERT, return NEW
  RETURN NEW;
END;
$$;