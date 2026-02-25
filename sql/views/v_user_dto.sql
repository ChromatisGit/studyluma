CREATE OR REPLACE VIEW v_user_dto AS
SELECT
  u.id,
  u.role,
  u.group_key,
  COALESCE(
    ARRAY_AGG(uc.course_id) FILTER (WHERE uc.course_id IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS course_ids
FROM users u
LEFT JOIN user_courses uc ON uc.user_id = u.id
GROUP BY u.id, u.role, u.group_key;
