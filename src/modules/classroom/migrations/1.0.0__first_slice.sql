CREATE TABLE courses (
  id text PRIMARY KEY,
  title text NOT NULL
);
CREATE TABLE course_enrollments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, course_id)
);
CREATE TABLE topics (
  id text PRIMARY KEY,
  title text NOT NULL
);
CREATE TABLE chapters (
  id text PRIMARY KEY,
  topic_id text NOT NULL REFERENCES topics(id),
  title text NOT NULL,
  body text NOT NULL
);
CREATE TABLE worksheets (
  id text PRIMARY KEY,
  chapter_id text NOT NULL REFERENCES chapters(id),
  public_key uuid NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL
);
CREATE TABLE course_chapters (
  course_id text NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  chapter_id text NOT NULL REFERENCES chapters(id),
  PRIMARY KEY (course_id, chapter_id)
);
CREATE TABLE worksheet_responses (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worksheet_id text NOT NULL REFERENCES worksheets(id),
  answer text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, worksheet_id)
);

INSERT INTO roles (key, description) VALUES ('admin', 'Application administrator') ON CONFLICT DO NOTHING;
INSERT INTO permissions (key, description) VALUES ('courses.manage', 'Manage StudyLuma courses') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_key, permission_key) VALUES ('admin', 'courses.manage') ON CONFLICT DO NOTHING;

ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_responses ENABLE ROW LEVEL SECURITY;

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
CREATE POLICY worksheet_responses_read ON worksheet_responses FOR SELECT USING (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM worksheets w
    JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    JOIN course_enrollments e ON e.course_id = cc.course_id
    WHERE w.id = worksheet_id AND e.user_id = user_id
  )
);
CREATE POLICY worksheet_responses_insert ON worksheet_responses FOR INSERT WITH CHECK (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM worksheets w
    JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    JOIN course_enrollments e ON e.course_id = cc.course_id
    WHERE w.id = worksheet_id AND e.user_id = user_id
  )
);
CREATE POLICY worksheet_responses_update ON worksheet_responses FOR UPDATE USING (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
) WITH CHECK (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM worksheets w
    JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    JOIN course_enrollments e ON e.course_id = cc.course_id
    WHERE w.id = worksheet_id AND e.user_id = user_id
  )
);

REVOKE ALL ON courses, course_enrollments, topics, chapters, worksheets, course_chapters, worksheet_responses FROM PUBLIC;
GRANT SELECT ON courses, course_enrollments, course_chapters, worksheet_responses TO chromatis_app;
GRANT INSERT, UPDATE ON worksheet_responses TO chromatis_app;
GRANT SELECT, INSERT, UPDATE ON topics, chapters, worksheets TO chromatis_app;
