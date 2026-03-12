-- Incremental migration for schema changes introduced after 2026-02-24.

BEGIN;

-- Keep new worksheet visibility default.
ALTER TABLE IF EXISTS course_worksheets
  ALTER COLUMN is_hidden SET DEFAULT true;

-- New slide state model (replaces old slide_sessions runtime model).
CREATE TABLE IF NOT EXISTS slide_state (
  course_id   TEXT PRIMARY KEY REFERENCES courses(course_id) ON DELETE CASCADE,
  slide_index INT NOT NULL DEFAULT 0,
  blackout    BOOLEAN NOT NULL DEFAULT false,
  macro_state JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Quiz runtime tables.
CREATE TABLE IF NOT EXISTS quiz_sessions (
  session_id       TEXT         PRIMARY KEY,
  course_id        TEXT         NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  phase            TEXT         NOT NULL DEFAULT 'waiting'
                                  CHECK (phase IN (
                                    'waiting',
                                    'active',
                                    'reveal_dist',
                                    'reveal_correct',
                                    'closed'
                                  )),
  questions        JSONB        NOT NULL,
  current_index    INTEGER      NOT NULL DEFAULT 0,
  timer_seconds    INTEGER,
  timer_started_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ  NOT NULL DEFAULT now(),
  created_at       TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quiz_participants (
  session_id  TEXT         NOT NULL REFERENCES quiz_sessions(session_id) ON DELETE CASCADE,
  user_id     TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  joined_at   TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS quiz_responses (
  session_id      TEXT         NOT NULL REFERENCES quiz_sessions(session_id) ON DELETE CASCADE,
  user_id         TEXT         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_index  INTEGER      NOT NULL,
  selected        INTEGER[]    NOT NULL,
  timed_out       BOOLEAN      NOT NULL DEFAULT false,
  submitted_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id, question_index)
);

-- Compatibility with older quiz schema revisions.
ALTER TABLE IF EXISTS quiz_sessions
  DROP COLUMN IF EXISTS channel_name;

DROP INDEX IF EXISTS idx_quiz_sessions_channel;

CREATE UNIQUE INDEX IF NOT EXISTS ux_quiz_one_active_per_course
  ON quiz_sessions(course_id)
  WHERE phase IN ('waiting', 'active', 'reveal_dist', 'reveal_correct');

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_course
  ON quiz_sessions(course_id);

CREATE INDEX IF NOT EXISTS idx_quiz_participants_session
  ON quiz_participants(session_id);

CREATE INDEX IF NOT EXISTS idx_quiz_responses_session
  ON quiz_responses(session_id, question_index);

-- RLS for quiz tables.
ALTER TABLE quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS quiz_sessions_student_read ON quiz_sessions;
DROP POLICY IF EXISTS quiz_sessions_admin_all ON quiz_sessions;

CREATE POLICY quiz_sessions_student_read ON quiz_sessions
  FOR SELECT USING (
    phase IN ('waiting', 'active', 'reveal_dist', 'reveal_correct')
    AND EXISTS (
      SELECT 1 FROM user_courses uc
      WHERE uc.course_id = quiz_sessions.course_id
        AND uc.user_id = current_setting('app.user_id', true)
    )
  );

CREATE POLICY quiz_sessions_admin_all ON quiz_sessions
  FOR ALL USING (current_setting('app.user_role', true) = 'admin');

DROP POLICY IF EXISTS quiz_participants_self ON quiz_participants;
DROP POLICY IF EXISTS quiz_participants_admin ON quiz_participants;

CREATE POLICY quiz_participants_self ON quiz_participants
  FOR ALL USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY quiz_participants_admin ON quiz_participants
  FOR ALL USING (current_setting('app.user_role', true) = 'admin');

DROP POLICY IF EXISTS quiz_responses_self_read ON quiz_responses;
DROP POLICY IF EXISTS quiz_responses_self_insert ON quiz_responses;
DROP POLICY IF EXISTS quiz_responses_admin_all ON quiz_responses;

CREATE POLICY quiz_responses_self_read ON quiz_responses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY quiz_responses_self_insert ON quiz_responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY quiz_responses_admin_all ON quiz_responses
  FOR ALL USING (current_setting('app.user_role', true) = 'admin');

-- Quiz helper function.
CREATE OR REPLACE FUNCTION try_advance_quiz_phase(
  p_session_id     TEXT,
  p_question_index INTEGER
)
RETURNS VOID
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_phase             TEXT;
  v_current_index     INTEGER;
  v_participant_count INTEGER;
  v_response_count    INTEGER;
BEGIN
  -- Only act when the session is actively accepting answers for the right question
  SELECT phase, current_index INTO v_phase, v_current_index
  FROM quiz_sessions
  WHERE session_id = p_session_id;

  IF v_phase IS DISTINCT FROM 'active' THEN
    RETURN;
  END IF;

  -- Ignore stale responses submitted for a previous question
  IF v_current_index IS DISTINCT FROM p_question_index THEN
    RETURN;
  END IF;

  SELECT COUNT(*) INTO v_participant_count
  FROM quiz_participants
  WHERE session_id = p_session_id;

  SELECT COUNT(*) INTO v_response_count
  FROM quiz_responses
  WHERE session_id = p_session_id
    AND question_index = p_question_index;

  IF v_participant_count > 0 AND v_response_count >= v_participant_count THEN
    UPDATE quiz_sessions
    SET phase      = 'reveal_dist',
        updated_at = now()
    WHERE session_id = p_session_id
      AND phase = 'active'; -- guard against race condition
  END IF;
END;
$$;

COMMIT;
