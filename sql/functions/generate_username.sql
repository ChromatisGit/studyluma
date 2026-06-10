-- Generate a username from a rotating word list and permuted 2-digit suffix
CREATE OR REPLACE FUNCTION generate_username()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  a          CONSTANT INTEGER := 31; -- gcd(31, 101) = 1
  b          CONSTANT INTEGER := 23; -- gcd(23, 99) = 1
  word_count CONSTANT INTEGER := 101; -- gcd(101, 99) = 1
  max_tries  CONSTANT INTEGER := word_count * 99;
  n          BIGINT;
  word_index INTEGER;
  word       TEXT;
  num        TEXT;
  v_username TEXT;
  i          INTEGER;
BEGIN
  FOR i IN 1..max_tries LOOP
    n := nextval('public.username_counter');

    word_index := ((a * n) % word_count)::INTEGER;

    SELECT uw.word
    INTO word
    FROM public.username_words uw
    WHERE uw.pos = word_index;

    IF word IS NULL THEN
      RAISE EXCEPTION 'Missing word at index % (must be contiguous 0..%)',
        word_index, word_count - 1;
    END IF;

    -- Permuted 2-digit number in range 01..99
    num := LPAD((((b * n) % 99) + 1)::TEXT, 2, '0');
    v_username := word || num;

    IF NOT EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.username = v_username
    ) THEN
      RETURN v_username;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'No unused username available in current cycle (word_count=%)', word_count;
END;
$$;
