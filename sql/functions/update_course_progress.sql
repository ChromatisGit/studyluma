-- Update course progress status for topics and chapters
CREATE OR REPLACE FUNCTION update_course_progress(
  p_course_id      TEXT,
  p_new_topic_id   TEXT,
  p_new_chapter_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_topic_order   INTEGER;
  v_chapter_order INTEGER;
BEGIN
  SELECT ct.display_order
  INTO v_topic_order
  FROM public.course_topics ct
  WHERE ct.course_id = p_course_id
    AND ct.topic_id = p_new_topic_id;

  IF v_topic_order IS NULL THEN
    RAISE EXCEPTION 'Topic % is not part of course %', p_new_topic_id, p_course_id
      USING ERRCODE = '22023';
  END IF;

  SELECT cc.display_order
  INTO v_chapter_order
  FROM public.course_chapters cc
  WHERE cc.course_id = p_course_id
    AND cc.topic_id = p_new_topic_id
    AND cc.chapter_id = p_new_chapter_id;

  IF v_chapter_order IS NULL THEN
    RAISE EXCEPTION 'Chapter % is not part of topic % in course %',
      p_new_chapter_id,
      p_new_topic_id,
      p_course_id
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.course_topics ct
  SET status = CASE
    WHEN ct.display_order < v_topic_order THEN 'finished'
    WHEN ct.topic_id = p_new_topic_id THEN 'current'
    WHEN ct.display_order = v_topic_order + 1 THEN 'planned'
    ELSE 'locked'
  END
  WHERE ct.course_id = p_course_id;

  UPDATE public.course_chapters cc
  SET status = CASE
    WHEN ct.display_order < v_topic_order THEN 'finished'
    WHEN cc.topic_id = p_new_topic_id AND cc.chapter_id = p_new_chapter_id THEN 'current'
    WHEN cc.topic_id = p_new_topic_id AND cc.display_order < v_chapter_order THEN 'finished'
    ELSE 'locked'
  END
  FROM public.course_topics ct
  WHERE ct.course_id = cc.course_id
    AND ct.topic_id = cc.topic_id
    AND cc.course_id = p_course_id;

  UPDATE public.courses c
  SET updated_at = NOW()
  WHERE c.course_id = p_course_id;
END;
$$;
