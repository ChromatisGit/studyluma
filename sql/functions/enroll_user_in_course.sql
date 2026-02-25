-- Enroll a user in a course
CREATE OR REPLACE FUNCTION enroll_user_in_course(p_user_id TEXT, p_course_id TEXT)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  INSERT INTO public.user_courses (user_id, course_id)
  VALUES (p_user_id, p_course_id)
  ON CONFLICT (user_id, course_id) DO NOTHING;
$$;
