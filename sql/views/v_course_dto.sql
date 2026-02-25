CREATE OR REPLACE VIEW v_course_dto AS
SELECT
  c.course_id                                                                   AS id,
  CASE WHEN cv.variant_short IS NOT NULL
       THEN s.subject_label || ' (' || cv.variant_short || ')'
       ELSE s.subject_label
  END                                                                            AS label,
  g.group_label                                                                  AS description,
  g.group_key,
  g.group_label,
  s.subject_id,
  s.subject_label,
  c.slug,
  c.icon,
  c.color,
  c.is_listed,
  c.is_public,
  c.registration_open_until,
  ARRAY[g.group_label, s.subject_label]                                          AS tags
FROM courses c
JOIN groups g           ON g.group_id   = c.group_id
JOIN subjects s         ON s.subject_id = c.subject_id
LEFT JOIN course_variants cv ON cv.variant_id = c.variant_id;
