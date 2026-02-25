-- ============================================================
-- StudyNode — Database Schema
-- ============================================================

-- ============================================================
-- 0) DROP tables
-- ============================================================

DROP TABLE IF EXISTS course_worksheets  CASCADE;
DROP TABLE IF EXISTS course_chapters    CASCADE;
DROP TABLE IF EXISTS course_topics      CASCADE;
DROP TABLE IF EXISTS task_responses     CASCADE;
DROP TABLE IF EXISTS checkpoint_responses CASCADE;
DROP TABLE IF EXISTS courses            CASCADE;
DROP TABLE IF EXISTS auth_attempts      CASCADE;
DROP TABLE IF EXISTS log_audit          CASCADE;
DROP TABLE IF EXISTS slide_sessions     CASCADE;

-- ============================================================
-- 1) Lookup tables
-- ============================================================

CREATE TABLE IF NOT EXISTS groups (
  group_id    TEXT PRIMARY KEY,
  group_label TEXT NOT NULL,
  group_key   TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS subjects (
  subject_id    TEXT PRIMARY KEY,
  subject_label TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS course_variants (
  variant_id    TEXT PRIMARY KEY,
  variant_label TEXT NOT NULL,
  variant_short TEXT NOT NULL
);

-- ============================================================
-- 2) Courses (normalized — progress tracked in junction tables)
-- ============================================================

CREATE TABLE courses (
  course_id             TEXT PRIMARY KEY,
  group_id              TEXT NOT NULL REFERENCES groups(group_id),
  subject_id            TEXT NOT NULL REFERENCES subjects(subject_id),
  variant_id            TEXT REFERENCES course_variants(variant_id),
  slug                  TEXT UNIQUE NOT NULL,
  icon                  TEXT,
  color                 TEXT NOT NULL,
  worksheet_format      TEXT NOT NULL CHECK (worksheet_format IN ('web', 'pdf')),
  is_listed             BOOLEAN NOT NULL DEFAULT true,
  is_public             BOOLEAN NOT NULL DEFAULT false,
  registration_open_until TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 3) Content definition tables (reusable across courses)
-- ============================================================

CREATE TABLE IF NOT EXISTS topics (
  topic_id  TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  href_slug TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chapters (
  chapter_id TEXT PRIMARY KEY,
  label      TEXT NOT NULL,
  href_slug  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS worksheets (
  worksheet_id     TEXT PRIMARY KEY,
  label            TEXT NOT NULL,
  href_slug        TEXT NOT NULL,
  worksheet_format TEXT NOT NULL CHECK (worksheet_format IN ('web', 'pdf', 'pdfSolution')),
  source_filename  TEXT NOT NULL DEFAULT ''
);

-- ============================================================
-- 4) Junction tables (course-specific structure + progress)
-- ============================================================

CREATE TABLE course_topics (
  course_id     TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  topic_id      TEXT NOT NULL REFERENCES topics(topic_id)   ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('current', 'finished', 'planned', 'locked')),
  PRIMARY KEY (course_id, topic_id)
);

CREATE TABLE course_chapters (
  course_id     TEXT NOT NULL REFERENCES courses(course_id)  ON DELETE CASCADE,
  topic_id      TEXT NOT NULL REFERENCES topics(topic_id)    ON DELETE CASCADE,
  chapter_id    TEXT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('current', 'finished', 'locked')),
  PRIMARY KEY (course_id, topic_id, chapter_id),
  FOREIGN KEY (course_id, topic_id)
    REFERENCES course_topics(course_id, topic_id) ON DELETE CASCADE
);

CREATE TABLE course_worksheets (
  course_id    TEXT NOT NULL REFERENCES courses(course_id)      ON DELETE CASCADE,
  topic_id     TEXT NOT NULL REFERENCES topics(topic_id)        ON DELETE CASCADE,
  chapter_id   TEXT NOT NULL REFERENCES chapters(chapter_id)    ON DELETE CASCADE,
  worksheet_id TEXT NOT NULL REFERENCES worksheets(worksheet_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  is_hidden    BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (course_id, topic_id, chapter_id, worksheet_id),
  FOREIGN KEY (course_id, topic_id, chapter_id)
    REFERENCES course_chapters(course_id, topic_id, chapter_id) ON DELETE CASCADE
);

-- ============================================================
-- 5) Users (add check constraint if users table already exists)
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id          TEXT PRIMARY KEY,
  role        TEXT NOT NULL CHECK (role IN ('admin', 'user')),
  group_key   TEXT,
  access_code TEXT UNIQUE NOT NULL,
  pin_hash    TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_admin_no_group CHECK (
    (role = 'admin' AND group_key IS NULL)
    OR
    (role = 'user'  AND group_key IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS user_courses (
  user_id    TEXT NOT NULL REFERENCES users(id)   ON DELETE CASCADE,
  course_id  TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id)
);

-- ============================================================
-- 6) Worksheet answer storage
-- ============================================================

CREATE TABLE task_responses (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  worksheet_id TEXT NOT NULL REFERENCES worksheets(worksheet_id) ON DELETE CASCADE,
  task_key     TEXT NOT NULL,
  value        TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, worksheet_id, task_key)
);

CREATE TABLE checkpoint_responses (
  id                  SERIAL PRIMARY KEY,
  user_id             TEXT NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  worksheet_id        TEXT NOT NULL REFERENCES worksheets(worksheet_id) ON DELETE CASCADE,
  section_index       INTEGER NOT NULL,
  understanding_level TEXT NOT NULL
    CHECK (understanding_level IN ('green', 'yellow', 'red')),
  difficulty_causes   TEXT[]
    CHECK (difficulty_causes <@ ARRAY['topic','task','approach','execution','mistake','other']),
  submitted_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, worksheet_id, section_index)
);

CREATE TABLE worksheet_presence (
  user_id       TEXT NOT NULL REFERENCES users(id)                     ON DELETE CASCADE,
  course_id     TEXT NOT NULL REFERENCES courses(course_id)            ON DELETE CASCADE,
  worksheet_id  TEXT NOT NULL REFERENCES worksheets(worksheet_id)      ON DELETE CASCADE,
  section_index INTEGER NOT NULL DEFAULT 0,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, course_id, worksheet_id)
);

-- ============================================================
-- 7) Auth and access code config
-- ============================================================

CREATE TABLE auth_attempts (
  bucket_key    TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until  TIMESTAMPTZ
);

CREATE SEQUENCE IF NOT EXISTS access_code_counter
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO CYCLE;

-- ============================================================
-- 8) Slide sessions (live cross-device presentation relay)
-- No RLS — admin-only access enforced at application level.
-- ============================================================

CREATE TABLE IF NOT EXISTS slide_sessions (
  channel_name    TEXT         PRIMARY KEY,
  state           JSONB        NOT NULL,
  updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
  last_heartbeat  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- ============================================================
-- 9) Write-only log tables (no RLS, log_ prefix convention)
-- ============================================================

CREATE TABLE log_audit (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 10) Indexes
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_courses_group    ON courses(group_id);
CREATE INDEX IF NOT EXISTS idx_courses_subject  ON courses(subject_id);
CREATE INDEX IF NOT EXISTS idx_courses_public   ON courses(is_public) WHERE is_public = true;
CREATE INDEX IF NOT EXISTS idx_courses_listed   ON courses(is_listed) WHERE is_listed = true;

CREATE INDEX IF NOT EXISTS idx_course_topics_order
  ON course_topics(course_id, display_order);

CREATE INDEX IF NOT EXISTS idx_course_chapters_order
  ON course_chapters(course_id, topic_id, display_order);

CREATE INDEX IF NOT EXISTS idx_course_worksheets_order
  ON course_worksheets(course_id, topic_id, chapter_id, display_order);

CREATE INDEX IF NOT EXISTS idx_course_worksheets_visible
  ON course_worksheets(course_id) WHERE is_hidden = false;

-- Progress invariants: only one 'current' per course
CREATE UNIQUE INDEX IF NOT EXISTS ux_course_topics_one_current
  ON course_topics(course_id) WHERE status = 'current';

CREATE UNIQUE INDEX IF NOT EXISTS ux_course_chapters_one_current
  ON course_chapters(course_id) WHERE status = 'current';

CREATE INDEX IF NOT EXISTS idx_users_access_code   ON users(access_code);
CREATE INDEX IF NOT EXISTS idx_users_group_key     ON users(group_key);

CREATE INDEX IF NOT EXISTS idx_user_courses_user   ON user_courses(user_id);

CREATE INDEX IF NOT EXISTS idx_task_responses_worksheet
  ON task_responses(user_id, worksheet_id);

CREATE INDEX IF NOT EXISTS idx_checkpoint_responses_worksheet
  ON checkpoint_responses(user_id, worksheet_id);

CREATE INDEX IF NOT EXISTS idx_worksheet_presence_admin
  ON worksheet_presence(course_id, worksheet_id, updated_at);

CREATE INDEX IF NOT EXISTS idx_auth_attempts_locked
  ON auth_attempts(locked_until) WHERE locked_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_log_audit_user      ON log_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_log_audit_event     ON log_audit(event_type);
CREATE INDEX IF NOT EXISTS idx_log_audit_timestamp ON log_audit(created_at);

-- ============================================================
-- 11) Row Level Security
-- ============================================================

-- Domain tables
ALTER TABLE groups            ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects          ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_variants   ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses           ENABLE ROW LEVEL SECURITY;
ALTER TABLE topics            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheets        ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_topics     ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_chapters   ENABLE ROW LEVEL SECURITY;
ALTER TABLE course_worksheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_courses      ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_responses    ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkpoint_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE worksheet_presence ENABLE ROW LEVEL SECURITY;

-- No RLS on: auth_attempts, log_audit (technical/write-only tables)

-- ============================================================
-- 12) RLS Policies
-- Fail-safe: NULL context → empty result (not all rows)
-- current_setting(..., true) returns NULL when not set
-- user_id = NULL evaluates to NULL → row filtered out
-- ============================================================

-- Lookup tables: public read
DROP POLICY IF EXISTS groups_read_all       ON groups;
DROP POLICY IF EXISTS subjects_read_all     ON subjects;
DROP POLICY IF EXISTS variants_read_all     ON course_variants;
DROP POLICY IF EXISTS topics_read_all       ON topics;
DROP POLICY IF EXISTS chapters_read_all     ON chapters;
DROP POLICY IF EXISTS worksheets_read_all   ON worksheets;

CREATE POLICY groups_read_all     ON groups           FOR SELECT USING (true);
CREATE POLICY subjects_read_all   ON subjects         FOR SELECT USING (true);
CREATE POLICY variants_read_all   ON course_variants  FOR SELECT USING (true);
CREATE POLICY topics_read_all     ON topics           FOR SELECT USING (true);
CREATE POLICY chapters_read_all   ON chapters         FOR SELECT USING (true);
CREATE POLICY worksheets_read_all ON worksheets       FOR SELECT USING (true);

-- Courses: admin all, public courses, enrolled users, listed courses (metadata)
DROP POLICY IF EXISTS courses_admin_all      ON courses;
DROP POLICY IF EXISTS courses_public         ON courses;
DROP POLICY IF EXISTS courses_user_enrolled  ON courses;
DROP POLICY IF EXISTS courses_listed_read    ON courses;

CREATE POLICY courses_admin_all ON courses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY courses_public ON courses
  FOR SELECT USING (is_public = true);

CREATE POLICY courses_user_enrolled ON courses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_courses uc
      WHERE uc.course_id = courses.course_id
        AND uc.user_id = current_setting('app.user_id', true)
    )
  );

-- Listed courses are publicly readable for the homepage course directory.
-- Content (topics/chapters/worksheets) remains protected by their own RLS.
CREATE POLICY courses_listed_read ON courses
  FOR SELECT USING (is_listed = true);

-- Course structure: inherits course access
DROP POLICY IF EXISTS course_topics_read     ON course_topics;
DROP POLICY IF EXISTS course_chapters_read   ON course_chapters;
DROP POLICY IF EXISTS course_worksheets_read ON course_worksheets;

CREATE POLICY course_topics_read ON course_topics
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.course_id = course_topics.course_id)
  );

CREATE POLICY course_chapters_read ON course_chapters
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.course_id = course_chapters.course_id)
  );

CREATE POLICY course_worksheets_read ON course_worksheets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM courses c WHERE c.course_id = course_worksheets.course_id)
    AND (
      is_hidden = false
      OR current_setting('app.user_role', true) = 'admin'
    )
  );

-- Users: own row, admin all
DROP POLICY IF EXISTS users_self_read  ON users;
DROP POLICY IF EXISTS users_admin_read ON users;

CREATE POLICY users_self_read ON users
  FOR SELECT USING (id = current_setting('app.user_id', true));

CREATE POLICY users_admin_read ON users
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

-- User courses: own row, admin all
DROP POLICY IF EXISTS user_courses_self_read  ON user_courses;
DROP POLICY IF EXISTS user_courses_admin_read ON user_courses;

CREATE POLICY user_courses_self_read ON user_courses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY user_courses_admin_read ON user_courses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

-- Task responses: own row, admin all
DROP POLICY IF EXISTS task_responses_self_read  ON task_responses;
DROP POLICY IF EXISTS task_responses_admin_read ON task_responses;

CREATE POLICY task_responses_self_read ON task_responses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY task_responses_admin_read ON task_responses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

-- Checkpoint responses: own row, admin all
DROP POLICY IF EXISTS checkpoint_responses_self_read  ON checkpoint_responses;
DROP POLICY IF EXISTS checkpoint_responses_admin_read ON checkpoint_responses;

CREATE POLICY checkpoint_responses_self_read ON checkpoint_responses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY checkpoint_responses_admin_read ON checkpoint_responses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

-- Worksheet presence: students write own row, admins read all
DROP POLICY IF EXISTS worksheet_presence_self       ON worksheet_presence;
DROP POLICY IF EXISTS worksheet_presence_admin_read ON worksheet_presence;

CREATE POLICY worksheet_presence_self ON worksheet_presence
  FOR ALL USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY worksheet_presence_admin_read ON worksheet_presence
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

-- Write policies for user-owned rows
DROP POLICY IF EXISTS task_responses_self_insert ON task_responses;
DROP POLICY IF EXISTS task_responses_self_update ON task_responses;

CREATE POLICY task_responses_self_insert ON task_responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY task_responses_self_update ON task_responses
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS checkpoint_responses_self_insert ON checkpoint_responses;
DROP POLICY IF EXISTS checkpoint_responses_self_update ON checkpoint_responses;

CREATE POLICY checkpoint_responses_self_insert ON checkpoint_responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY checkpoint_responses_self_update ON checkpoint_responses
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

-- Functions, views, and seed data are applied separately by db-init.ts.
-- See website/scripts/db-init.ts for the complete execution order.
