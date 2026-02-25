-- Return full course progress tree as JSONB
CREATE OR REPLACE FUNCTION get_progress_dto(p_course_id TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH course_base AS (
  SELECT
    c.course_id,
    c.slug
  FROM public.courses c
  WHERE c.course_id = p_course_id
),
topic_rows AS (
  SELECT
    ct.course_id,
    ct.topic_id,
    t.label AS topic_label,
    CONCAT(cb.slug, '/', t.href_slug) AS topic_href,
    ct.status AS topic_status,
    ct.display_order AS topic_order
  FROM public.course_topics ct
  JOIN public.topics t
    ON t.topic_id = ct.topic_id
  JOIN course_base cb
    ON cb.course_id = ct.course_id
),
chapter_rows AS (
  SELECT
    cc.course_id,
    cc.topic_id,
    cc.chapter_id,
    ch.label AS chapter_label,
    CONCAT(cb.slug, '/', t.href_slug, '/', ch.href_slug) AS chapter_href,
    cc.status AS chapter_status,
    cc.display_order AS chapter_order
  FROM public.course_chapters cc
  JOIN public.chapters ch
    ON ch.chapter_id = cc.chapter_id
  JOIN public.topics t
    ON t.topic_id = cc.topic_id
  JOIN course_base cb
    ON cb.course_id = cc.course_id
),
current_ids AS (
  SELECT
    COALESCE(
      (SELECT tr.topic_id FROM topic_rows tr WHERE tr.topic_status = 'current'),
      ''
    ) AS current_topic_id,
    COALESCE(
      (SELECT cr.chapter_id FROM chapter_rows cr WHERE cr.chapter_status = 'current'),
      ''
    ) AS current_chapter_id
),
worksheets_by_chapter AS (
  SELECT
    w.course_id,
    w.topic_id,
    w.chapter_id,
    jsonb_agg(
      jsonb_build_object(
        'worksheetId', w.worksheet_id,
        'label', w.label,
        'href', w.href,
        'worksheetFormat', w.worksheet_format
      )
      ORDER BY w.display_order, w.worksheet_id
    ) AS worksheets
  FROM public.v_worksheets_by_chapter w
  WHERE w.course_id = p_course_id
    AND w.is_hidden = false
  GROUP BY w.course_id, w.topic_id, w.chapter_id
),
chapters_with_worksheets AS (
  SELECT
    cr.course_id,
    cr.topic_id,
    cr.chapter_order,
    cr.chapter_id,
    jsonb_build_object(
      'chapterId', cr.chapter_id,
      'label', cr.chapter_label,
      'href', cr.chapter_href,
      'status', cr.chapter_status,
      'worksheets', COALESCE(wbc.worksheets, '[]'::jsonb)
    ) AS chapter_obj
  FROM chapter_rows cr
  LEFT JOIN worksheets_by_chapter wbc
    ON wbc.course_id = cr.course_id
   AND wbc.topic_id = cr.topic_id
   AND wbc.chapter_id = cr.chapter_id
),
chapters_by_topic AS (
  SELECT
    cww.course_id,
    cww.topic_id,
    jsonb_agg(cww.chapter_obj ORDER BY cww.chapter_order, cww.chapter_id) AS chapters
  FROM chapters_with_worksheets cww
  GROUP BY cww.course_id, cww.topic_id
),
topics_with_chapters AS (
  SELECT
    tr.course_id,
    tr.topic_order,
    tr.topic_id,
    jsonb_build_object(
      'topicId', tr.topic_id,
      'label', tr.topic_label,
      'href', tr.topic_href,
      'status', tr.topic_status,
      'chapters', COALESCE(cbt.chapters, '[]'::jsonb)
    ) AS topic_obj
  FROM topic_rows tr
  LEFT JOIN chapters_by_topic cbt
    ON cbt.course_id = tr.course_id
   AND cbt.topic_id = tr.topic_id
),
topics_agg AS (
  SELECT
    twc.course_id,
    jsonb_agg(twc.topic_obj ORDER BY twc.topic_order, twc.topic_id) AS topics
  FROM topics_with_chapters twc
  GROUP BY twc.course_id
)
SELECT jsonb_build_object(
  'currentTopicId', ci.current_topic_id,
  'currentChapterId', ci.current_chapter_id,
  'topics', COALESCE(ta.topics, '[]'::jsonb)
)
FROM current_ids ci
LEFT JOIN topics_agg ta
  ON TRUE;
$$;
