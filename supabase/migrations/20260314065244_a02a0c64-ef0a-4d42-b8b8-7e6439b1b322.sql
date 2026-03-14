
CREATE OR REPLACE FUNCTION public.get_user_email_map()
RETURNS TABLE(user_id uuid, email text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id as user_id, au.email::text as email
  FROM auth.users au
  INNER JOIN public.user_roles ur ON ur.user_id = au.id;
$$;
