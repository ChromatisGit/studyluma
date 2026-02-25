-- Rate limiting check and record attempt
CREATE OR REPLACE FUNCTION check_and_record_attempt(
  p_bucket_key TEXT,
  p_success    BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
AS $$
DECLARE
  v_bucket     public.auth_attempts%ROWTYPE;
  v_now        TIMESTAMPTZ := NOW();
  v_max        INTEGER     := 5;
  v_window     INTERVAL    := INTERVAL '15 minutes';
BEGIN
  IF p_success THEN
    DELETE FROM public.auth_attempts
    WHERE bucket_key = p_bucket_key;

    RETURN jsonb_build_object('allowed', true);
  END IF;

  SELECT *
  INTO v_bucket
  FROM public.auth_attempts
  WHERE bucket_key = p_bucket_key
  FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.auth_attempts (bucket_key, attempt_count, window_start)
      VALUES (p_bucket_key, 1, v_now);

      RETURN jsonb_build_object('allowed', true, 'attempts', 1);
    EXCEPTION
      WHEN unique_violation THEN
        SELECT *
        INTO v_bucket
        FROM public.auth_attempts
        WHERE bucket_key = p_bucket_key
        FOR UPDATE;
    END;
  END IF;

  IF v_bucket.locked_until IS NOT NULL AND v_bucket.locked_until > v_now THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'locked',
      'locked_until', v_bucket.locked_until
    );
  END IF;

  IF v_now - v_bucket.window_start > v_window THEN
    UPDATE public.auth_attempts
    SET attempt_count = 1,
        window_start = v_now,
        locked_until = NULL
    WHERE bucket_key = p_bucket_key;

    RETURN jsonb_build_object('allowed', true, 'attempts', 1);
  END IF;

  UPDATE public.auth_attempts
  SET attempt_count = attempt_count + 1,
      locked_until  = CASE
        WHEN attempt_count + 1 >= v_max THEN v_now + v_window
        ELSE NULL
      END
  WHERE bucket_key = p_bucket_key
  RETURNING attempt_count
  INTO v_bucket.attempt_count;

  IF v_bucket.attempt_count >= v_max THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'too_many_attempts',
      'attempts', v_bucket.attempt_count
    );
  END IF;

  RETURN jsonb_build_object('allowed', true, 'attempts', v_bucket.attempt_count);
END;
$$;
