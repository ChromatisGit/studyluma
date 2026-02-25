-- Login bootstrap lookup by access code
CREATE OR REPLACE FUNCTION get_user_for_login(p_access_code TEXT)
RETURNS TABLE (
  id          TEXT,
  role        TEXT,
  group_key   TEXT,
  access_code TEXT,
  pin_hash    TEXT,
  course_ids  TEXT[]
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
      u.group_key,
      u.access_code,
      u.pin_hash
    FROM public.users u
    WHERE LOWER(u.access_code) = LOWER(p_access_code)
  ),
  user_courses_agg AS (
    SELECT
      uc.user_id,
      array_agg(uc.course_id ORDER BY uc.course_id) AS course_ids
    FROM public.user_courses uc
    JOIN selected_user su
      ON su.id = uc.user_id
    GROUP BY uc.user_id
  )
  SELECT
    su.id,
    su.role,
    su.group_key,
    su.access_code,
    su.pin_hash,
    COALESCE(uca.course_ids, ARRAY[]::TEXT[]) AS course_ids
  FROM selected_user su
  LEFT JOIN user_courses_agg uca
    ON uca.user_id = su.id;
$$;
