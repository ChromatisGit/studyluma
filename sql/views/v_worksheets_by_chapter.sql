CREATE OR REPLACE VIEW v_worksheets_by_chapter AS
SELECT
  cw.course_id,
  cw.topic_id,
  cw.chapter_id,
  cw.worksheet_id,
  w.label,
  CASE
    WHEN w.worksheet_format IN ('pdf', 'pdfSolution')
    THEN CONCAT('/.generated/pdf/', c.subject_id, '/', cw.topic_id, '/', cw.chapter_id, '/worksheets/', cw.worksheet_id, '.pdf')
    ELSE CONCAT(c.slug, '/', t.href_slug, '/', ch.href_slug, '/', w.href_slug)
  END                 AS href,
  CASE
    WHEN w.worksheet_format = 'pdfSolution'
    THEN CONCAT('/.generated/pdf/', c.subject_id, '/', cw.topic_id, '/', cw.chapter_id, '/worksheets/', cw.worksheet_id, '-solution.pdf')
    ELSE NULL
  END                 AS solution_href,
  w.worksheet_format,
  cw.is_hidden,
  cw.is_solution_hidden,
  cw.display_order
FROM course_worksheets cw
JOIN worksheets w  ON w.worksheet_id  = cw.worksheet_id
JOIN courses c     ON c.course_id     = cw.course_id
JOIN topics t      ON t.topic_id      = cw.topic_id
JOIN chapters ch   ON ch.chapter_id   = cw.chapter_id;
