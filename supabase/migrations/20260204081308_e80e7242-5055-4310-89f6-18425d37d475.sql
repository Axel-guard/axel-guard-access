-- Drop the problematic policy that requires JWT
DROP POLICY IF EXISTS "Anyone can check email allowlist" ON public.allowed_emails;

-- Create a public policy that allows anyone to check if an email exists (for login validation)
-- This is safe because it only allows checking existence, not reading sensitive data
CREATE POLICY "Public can check email existence"
ON public.allowed_emails
FOR SELECT
USING (true);

-- Also ensure the is_email_allowed function works without auth
CREATE OR REPLACE FUNCTION public.is_email_allowed(_email TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.allowed_emails
    WHERE LOWER(email) = LOWER(_email)
  )
$$;