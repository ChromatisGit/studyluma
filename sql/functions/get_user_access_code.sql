-- Get access code for a user
CREATE OR REPLACE FUNCTION get_user_access_code(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.access_code
  FROM public.users u
  WHERE u.id = p_user_id;
$$;
