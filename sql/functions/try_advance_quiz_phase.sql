-- Advances a quiz session from 'active' to 'reveal_dist' when all participants
-- have submitted their response for the current question.
-- Called by the student after submitting a response (via anonSQL / direct call).
-- SECURITY DEFINER bypasses RLS so students can trigger the phase update.

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
  v_participant_count INTEGER;
  v_response_count    INTEGER;
BEGIN
  -- Only act when the session is actively accepting answers
  SELECT phase INTO v_phase
  FROM quiz_sessions
  WHERE session_id = p_session_id;

  IF v_phase IS DISTINCT FROM 'active' THEN
    RETURN;
  END IF;

  -- Count how many students are in this session
  SELECT COUNT(*) INTO v_participant_count
  FROM quiz_participants
  WHERE session_id = p_session_id;

  -- Count responses for the current question
  SELECT COUNT(*) INTO v_response_count
  FROM quiz_responses
  WHERE session_id = p_session_id
    AND question_index = p_question_index;

  -- Auto-advance only when every participant has answered
  IF v_participant_count > 0 AND v_response_count >= v_participant_count THEN
    UPDATE quiz_sessions
    SET phase      = 'reveal_dist',
        updated_at = now()
    WHERE session_id = p_session_id
      AND phase = 'active'; -- guard against race condition
  END IF;
END;
$$;
