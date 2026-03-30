-- ── Link employees.user_id to auth.users by email match ──────────────────────
-- This ensures Tasks, Tickets, and CRM all resolve UUIDs → employee names.
-- Safe to run multiple times (only updates rows where user_id is NULL).

UPDATE public.employees e
SET user_id = au.id
FROM auth.users au
WHERE lower(au.email) = lower(e.email)
  AND e.user_id IS NULL
  AND au.deleted_at IS NULL;

-- ── get_all_user_profiles RPC (idempotent) ────────────────────────────────────
-- Returns ALL non-deleted auth users with their employee name + role.
-- Used by Tasks/Tickets to resolve UUID → display name on the client.

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
