-- Atomic user account creation
CREATE OR REPLACE FUNCTION create_user_account(
  p_user_id     TEXT,
  p_access_code TEXT,
  p_pin_hash    TEXT,
  p_group_key   TEXT,
  p_course_ids  TEXT[]
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH inserted_user AS (
    INSERT INTO public.users (id, role, group_key, access_code, pin_hash)
    VALUES (p_user_id, 'user', p_group_key, p_access_code, p_pin_hash)
    RETURNING id
  ),
  requested_courses AS (
    SELECT DISTINCT requested.course_id
    FROM unnest(COALESCE(p_course_ids, ARRAY[]::TEXT[])) AS requested(course_id)
    WHERE requested.course_id IS NOT NULL
  )
  INSERT INTO public.user_courses (user_id, course_id)
  SELECT iu.id, rc.course_id
  FROM inserted_user iu
  JOIN requested_courses rc ON TRUE
  ON CONFLICT (user_id, course_id) DO NOTHING;
$$;
