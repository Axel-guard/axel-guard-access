-- Restrict deletion of allowed_emails to Master Admin only
-- Keep other policies unchanged

DROP POLICY IF EXISTS "Admins can delete allowed emails" ON public.allowed_emails;

CREATE POLICY "Master admins can delete allowed emails"
ON public.allowed_emails
FOR DELETE
TO authenticated
USING (
  public.is_master_admin(auth.uid())
  AND lower(email) <> 'info@axel-guard.com'
);
