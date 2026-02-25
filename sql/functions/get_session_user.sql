-- Session bootstrap lookup by user id
CREATE OR REPLACE FUNCTION get_session_user(p_user_id TEXT)
RETURNS TABLE (
  id         TEXT,
  role       TEXT,
  group_key  TEXT,
  course_ids TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH selected_user AS (
    SELECT
      u.id,
      u.role,
      u.group_key
    FROM public.users u
    WHERE u.id = p_user_id
  ),
  user_courses_agg AS (
    SELECT
      uc.user_id,
      array_agg(uc.course_id ORDER BY uc.course_id) AS course_ids
    FROM public.user_courses uc
    WHERE uc.user_id = p_user_id
    GROUP BY uc.user_id
  )
  SELECT
    su.id,
    su.role,
    su.group_key,
    COALESCE(uca.course_ids, ARRAY[]::TEXT[]) AS course_ids
  FROM selected_user su
  LEFT JOIN user_courses_agg uca
    ON uca.user_id = su.id;
$$;
