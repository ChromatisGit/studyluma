-- Adds the 'summary' phase to quiz_sessions and removes unused timer columns.
--
-- summary = teacher-controlled end state after the last reveal_correct,
-- where students see their score and the class sees aggregate results before
-- the session is formally closed.

BEGIN;

-- Drop the unnamed check constraint on phase (PostgreSQL auto-names it
-- <table>_<column>_check) and re-add it with the summary value included.
ALTER TABLE quiz_sessions DROP CONSTRAINT IF EXISTS quiz_sessions_phase_check;

ALTER TABLE quiz_sessions
  ADD CONSTRAINT quiz_sessions_phase_check
  CHECK (phase IN (
    'waiting',
    'active',
    'reveal_dist',
    'reveal_correct',
    'summary',
    'closed'
  ));

-- Remove timer columns that are no longer used.
ALTER TABLE quiz_sessions DROP COLUMN IF EXISTS timer_seconds;
ALTER TABLE quiz_sessions DROP COLUMN IF EXISTS timer_started_at;

-- Adds get_quiz_broadcast_data(), a SECURITY DEFINER function used by
-- publishQuizUpdate() to fetch quiz state + aggregate counts without being
-- subject to student RLS policies on quiz_participants and quiz_responses.

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


COMMIT;
