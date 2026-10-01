CREATE TABLE courses (
  id text PRIMARY KEY,
  title text NOT NULL
);
CREATE TABLE course_enrollments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, course_id)
);

CREATE TABLE course_chapters (
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES chapters(id),
  PRIMARY KEY (course_id, chapter_id)
);

INSERT INTO roles (key, description) VALUES ('admin', 'Application administrator') ON CONFLICT DO NOTHING;
INSERT INTO permissions (key, description) VALUES ('courses.manage', 'Manage StudyLuma courses') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_key, permission_key) VALUES ('admin', 'courses.manage') ON CONFLICT DO NOTHING;


ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chapters ENABLE ROW LEVEL SECURITY;

CREATE POLICY courses_read ON courses FOR SELECT USING (
  EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = id AND e.user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  OR chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
);
CREATE POLICY enrollments_read ON course_enrollments FOR SELECT USING (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
  OR chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
);
CREATE POLICY course_chapters_read ON course_chapters FOR SELECT USING (
  EXISTS (SELECT 1 FROM course_enrollments e WHERE e.course_id = course_chapters.course_id AND e.user_id = nullif(current_setting('app.user_id', true), '')::uuid)
  OR chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
);

REVOKE ALL ON courses, course_enrollments, course_chapters FROM PUBLIC;
GRANT SELECT ON courses, course_enrollments, course_chapters TO chromatis_app;
