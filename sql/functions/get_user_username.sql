-- Get username for a user
CREATE OR REPLACE FUNCTION get_user_username(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.username
  FROM public.users u
  WHERE u.id = p_user_id;
$$;
