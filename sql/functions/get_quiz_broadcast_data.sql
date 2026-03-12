-- Returns the full quiz session row plus aggregate counts needed for Ably broadcasts.
-- SECURITY DEFINER bypasses RLS so this can be called via anonSQL from student-triggered
-- code paths (submitQuizResponse, joinQuizSession) without the student's RLS restrictions
-- corrupting the participant and response counts sent to the admin channel.

CREATE OR REPLACE FUNCTION get_quiz_broadcast_data(p_session_id TEXT)
RETURNS TABLE (
  session_id       TEXT,
  course_id        TEXT,
  phase            TEXT,
  questions        JSONB,
  current_index    INTEGER,
  timer_seconds    INTEGER,
  timer_started_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ,
  participant_count INTEGER,
  responses        JSON
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    s.session_id,
    s.course_id,
    s.phase,
    s.questions,
    s.current_index,
    s.timer_seconds,
    s.timer_started_at,
    s.updated_at,
    s.created_at,
    (SELECT COUNT(*)::int FROM quiz_participants p WHERE p.session_id = s.session_id),
    COALESCE(
      (SELECT json_agg(r.selected)
       FROM quiz_responses r
       WHERE r.session_id = s.session_id
         AND r.question_index = s.current_index),
      '[]'::json
    )
  FROM quiz_sessions s
  WHERE s.session_id = p_session_id
$$;
