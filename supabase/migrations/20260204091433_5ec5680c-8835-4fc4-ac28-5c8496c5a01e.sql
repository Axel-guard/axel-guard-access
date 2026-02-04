-- Create OTP verification table
CREATE TABLE public.otp_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  otp_code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  attempts INTEGER DEFAULT 0,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on otp_verifications
ALTER TABLE public.otp_verifications ENABLE ROW LEVEL SECURITY;

-- Public policy for OTP operations (handled by edge function with service role)
CREATE POLICY "Service role can manage OTPs"
ON public.otp_verifications
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_otp_email_expires ON public.otp_verifications(email, expires_at);

-- Clean up expired OTPs function
CREATE OR REPLACE FUNCTION public.cleanup_expired_otps()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.otp_verifications
  WHERE expires_at < NOW() OR used = TRUE;
END;
$$;

-- Update is_admin function to also check for master_admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND (role = 'admin' OR role = 'master_admin')
  )
$$;

-- Create is_master_admin function
CREATE OR REPLACE FUNCTION public.is_master_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = 'master_admin'
  )
$$;

-- Insert master admin email if not exists
INSERT INTO public.allowed_emails (email, role)
VALUES ('info@axel-guard.com', 'master_admin')
ON CONFLICT (email) DO UPDATE SET role = 'master_admin';

-- Update handle_new_user function to handle all roles including master_admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role app_role;
  email_count INTEGER;
BEGIN
  -- Check if this is the first user and email is the master admin
  SELECT COUNT(*) INTO email_count FROM public.allowed_emails;
  
  -- Get the role from allowed_emails
  SELECT role INTO user_role
  FROM public.allowed_emails
  WHERE LOWER(email) = LOWER(NEW.email);
  
  -- If email is in allowed list, assign the role
  IF user_role IS NOT NULL THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, user_role)
    ON CONFLICT (user_id, role) DO NOTHING;
  -- If no emails exist and this is the master admin email, auto-approve
  ELSIF email_count = 0 AND LOWER(NEW.email) = 'info@axel-guard.com' THEN
    INSERT INTO public.allowed_emails (email, role)
    VALUES (NEW.email, 'master_admin');
    
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'master_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$;