-- ── RPC: get_all_user_profiles ────────────────────────────────────────────────
-- Like get_user_profiles but returns ALL non-deleted auth users (not just
-- those in allowed_emails). Used for UUID→name resolution in ticket display.
-- SECURITY DEFINER so it can read auth.users from the client.

CREATE OR REPLACE FUNCTION public.get_all_user_profiles()
RETURNS TABLE(user_id uuid, email text, name text, employee_role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    au.id                                       AS user_id,
    au.email,
    COALESCE(
      (SELECT e.name
         FROM employees e
        WHERE lower(e.email) = lower(au.email)
          AND e.is_active = true
        LIMIT 1),
      au.raw_user_meta_data->>'full_name',
      split_part(au.email, '@', 1)
    )                                           AS name,
    COALESCE(
      (SELECT e.employee_role
         FROM employees e
        WHERE lower(e.email) = lower(au.email)
          AND e.is_active = true
        LIMIT 1),
      'User'
    )                                           AS employee_role
  FROM auth.users au
  WHERE au.deleted_at IS NULL;
$$;

GRANT EXECUTE ON FUNCTION public.get_all_user_profiles() TO authenticated;
