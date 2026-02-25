-- Set course registration window
CREATE OR REPLACE FUNCTION set_registration_open_until(p_course_id TEXT, p_open_until TIMESTAMPTZ)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.courses c
  SET registration_open_until = p_open_until,
      updated_at = NOW()
  WHERE c.course_id = p_course_id;
$$;
