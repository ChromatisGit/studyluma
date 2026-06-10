-- Atomically generate a unique username and create the user account
CREATE OR REPLACE FUNCTION create_user_with_username(
  p_user_id   TEXT,
  p_pin_hash  TEXT,
  p_group_key TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_username        TEXT;
  v_attempts        INTEGER := 0;
  v_constraint_name TEXT;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;

    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Failed to create user with a unique username after 100 attempts';
    END IF;

    v_username := public.generate_username();

    BEGIN
      PERFORM public.create_user_account(
        p_user_id,
        v_username,
        p_pin_hash,
        p_group_key,
        ARRAY[]::TEXT[]
      );

      RETURN v_username;
    EXCEPTION
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;

        IF v_constraint_name = 'users_username_key' THEN
          CONTINUE;
        END IF;

        RAISE;
    END;
  END LOOP;
END;
$$;
