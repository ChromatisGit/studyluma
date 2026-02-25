-- Return courses grouped by access level for the current session context
CREATE OR REPLACE FUNCTION get_course_access_groups()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH session_context AS (
  SELECT
    current_setting('app.user_role', true) AS user_role,
    current_setting('app.user_id', true)   AS user_id,
    current_setting('app.group_key', true) AS group_key
),
course_access AS (
  SELECT
    c.id,
    c.is_listed,
    c.is_public,
    (
      sc.user_role = 'admin'
      OR c.group_key = sc.group_key
      OR uc.user_id IS NOT NULL
    ) AS is_accessible
  FROM public.v_course_dto c
  CROSS JOIN session_context sc
  LEFT JOIN public.user_courses uc
    ON uc.course_id = c.id
   AND uc.user_id = sc.user_id
)
SELECT jsonb_build_object(
  'public', COALESCE(
    jsonb_agg(ca.id ORDER BY ca.id)
      FILTER (WHERE ca.is_listed AND ca.is_public),
    '[]'::jsonb
  ),
  'accessible', COALESCE(
    jsonb_agg(ca.id ORDER BY ca.id)
      FILTER (WHERE ca.is_listed AND NOT ca.is_public AND ca.is_accessible),
    '[]'::jsonb
  ),
  'restricted', COALESCE(
    jsonb_agg(ca.id ORDER BY ca.id)
      FILTER (WHERE ca.is_listed AND NOT ca.is_public AND NOT ca.is_accessible),
    '[]'::jsonb
  ),
  'hidden', COALESCE(
    jsonb_agg(ca.id ORDER BY ca.id)
      FILTER (WHERE NOT ca.is_listed),
    '[]'::jsonb
  )
)
FROM course_access ca;
$$;
