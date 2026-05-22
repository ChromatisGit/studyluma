-- ============================================================
-- StudyNode — Initial Schema Migration
-- ============================================================

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
-- 2) Courses
-- ============================================================

CREATE TABLE IF NOT EXISTS courses (
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
-- 3) Content definition tables
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
-- 4) Junction tables (course-specific structure)
-- ============================================================

CREATE TABLE IF NOT EXISTS course_topics (
  course_id     TEXT NOT NULL REFERENCES courses(course_id) ON DELETE CASCADE,
  topic_id      TEXT NOT NULL REFERENCES topics(topic_id)   ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('current', 'finished', 'planned', 'locked')),
  PRIMARY KEY (course_id, topic_id)
);

CREATE TABLE IF NOT EXISTS course_chapters (
  course_id     TEXT NOT NULL REFERENCES courses(course_id)  ON DELETE CASCADE,
  topic_id      TEXT NOT NULL REFERENCES topics(topic_id)    ON DELETE CASCADE,
  chapter_id    TEXT NOT NULL REFERENCES chapters(chapter_id) ON DELETE CASCADE,
  display_order INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('current', 'finished', 'locked')),
  PRIMARY KEY (course_id, topic_id, chapter_id),
  FOREIGN KEY (course_id, topic_id)
    REFERENCES course_topics(course_id, topic_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS course_worksheets (
  course_id    TEXT NOT NULL REFERENCES courses(course_id)      ON DELETE CASCADE,
  topic_id     TEXT NOT NULL REFERENCES topics(topic_id)        ON DELETE CASCADE,
  chapter_id   TEXT NOT NULL REFERENCES chapters(chapter_id)    ON DELETE CASCADE,
  worksheet_id TEXT NOT NULL REFERENCES worksheets(worksheet_id) ON DELETE CASCADE,
  display_order       INTEGER NOT NULL,
  is_hidden           BOOLEAN NOT NULL DEFAULT true,
  is_solution_hidden  BOOLEAN NOT NULL DEFAULT true,
  PRIMARY KEY (course_id, topic_id, chapter_id, worksheet_id),
  FOREIGN KEY (course_id, topic_id, chapter_id)
    REFERENCES course_chapters(course_id, topic_id, chapter_id) ON DELETE CASCADE
);

-- ============================================================
-- 5) Users
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

CREATE TABLE IF NOT EXISTS task_responses (
  id           SERIAL PRIMARY KEY,
  user_id      TEXT NOT NULL REFERENCES users(id)       ON DELETE CASCADE,
  worksheet_id TEXT NOT NULL REFERENCES worksheets(worksheet_id) ON DELETE CASCADE,
  task_key     TEXT NOT NULL,
  value        TEXT NOT NULL,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, worksheet_id, task_key)
);

CREATE TABLE IF NOT EXISTS checkpoint_responses (
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

CREATE TABLE IF NOT EXISTS worksheet_presence (
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

CREATE TABLE IF NOT EXISTS auth_attempts (
  bucket_key    TEXT PRIMARY KEY,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  window_start  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  locked_until  TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS access_code_words (
  pos  INTEGER PRIMARY KEY,
  word TEXT NOT NULL UNIQUE
);

CREATE SEQUENCE IF NOT EXISTS access_code_counter
  START WITH 1
  INCREMENT BY 1
  MINVALUE 1
  NO CYCLE;

-- ============================================================
-- 8) Live presentation state
-- ============================================================

CREATE TABLE IF NOT EXISTS slide_state (
  course_id   TEXT PRIMARY KEY REFERENCES courses(course_id) ON DELETE CASCADE,
  slide_index INT NOT NULL DEFAULT 0,
  blackout    BOOLEAN NOT NULL DEFAULT false,
  macro_state JSONB NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 9) Live quiz tables
-- ============================================================

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

-- ============================================================
-- 10) Write-only log tables
-- ============================================================

CREATE TABLE IF NOT EXISTS log_audit (
  id         SERIAL PRIMARY KEY,
  user_id    TEXT,
  event_type TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  metadata   JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 11) Content pages (DB-backed compiled content)
-- ============================================================

CREATE TABLE IF NOT EXISTS content_pages (
  content_key   TEXT PRIMARY KEY,
  page_kind     TEXT NOT NULL CHECK (page_kind IN ('chapter', 'worksheet', 'practice', 'slides', 'overview')),
  subject_id    TEXT REFERENCES subjects(subject_id),
  topic_id      TEXT REFERENCES topics(topic_id),
  chapter_id    TEXT REFERENCES chapters(chapter_id),
  worksheet_id  TEXT REFERENCES worksheets(worksheet_id),
  title         TEXT NOT NULL DEFAULT '',
  source_format TEXT NOT NULL DEFAULT 'markdown',
  source_path   TEXT NOT NULL DEFAULT '',
  content_json  JSONB NOT NULL,
  content_hash  TEXT NOT NULL DEFAULT '',
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS content_pages_key_idx ON content_pages (content_key);
CREATE INDEX IF NOT EXISTS content_pages_kind_idx ON content_pages (page_kind);
CREATE INDEX IF NOT EXISTS content_pages_subject_topic_idx ON content_pages (subject_id, topic_id);
CREATE INDEX IF NOT EXISTS content_pages_chapter_idx ON content_pages (chapter_id);
CREATE INDEX IF NOT EXISTS content_pages_worksheet_idx ON content_pages (worksheet_id);

-- ============================================================
-- 12) Indexes
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

CREATE UNIQUE INDEX IF NOT EXISTS ux_quiz_one_active_per_course
  ON quiz_sessions(course_id)
  WHERE phase IN ('waiting', 'active', 'reveal_dist', 'reveal_correct');

CREATE INDEX IF NOT EXISTS idx_quiz_sessions_course ON quiz_sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session ON quiz_participants(session_id);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_session ON quiz_responses(session_id, question_index);

-- ============================================================
-- 13) Row Level Security
-- ============================================================

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
ALTER TABLE quiz_sessions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_participants  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_responses    ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 14) RLS Policies
-- ============================================================

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

CREATE POLICY courses_listed_read ON courses
  FOR SELECT USING (is_listed = true);

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

DROP POLICY IF EXISTS users_self_read  ON users;
DROP POLICY IF EXISTS users_admin_read ON users;

CREATE POLICY users_self_read ON users
  FOR SELECT USING (id = current_setting('app.user_id', true));

CREATE POLICY users_admin_read ON users
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

DROP POLICY IF EXISTS user_courses_self_read  ON user_courses;
DROP POLICY IF EXISTS user_courses_admin_read ON user_courses;

CREATE POLICY user_courses_self_read ON user_courses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY user_courses_admin_read ON user_courses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

DROP POLICY IF EXISTS task_responses_self_read  ON task_responses;
DROP POLICY IF EXISTS task_responses_admin_read ON task_responses;
DROP POLICY IF EXISTS task_responses_self_insert ON task_responses;
DROP POLICY IF EXISTS task_responses_self_update ON task_responses;

CREATE POLICY task_responses_self_read ON task_responses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY task_responses_admin_read ON task_responses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY task_responses_self_insert ON task_responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY task_responses_self_update ON task_responses
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS checkpoint_responses_self_read  ON checkpoint_responses;
DROP POLICY IF EXISTS checkpoint_responses_admin_read ON checkpoint_responses;
DROP POLICY IF EXISTS checkpoint_responses_self_insert ON checkpoint_responses;
DROP POLICY IF EXISTS checkpoint_responses_self_update ON checkpoint_responses;

CREATE POLICY checkpoint_responses_self_read ON checkpoint_responses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY checkpoint_responses_admin_read ON checkpoint_responses
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

CREATE POLICY checkpoint_responses_self_insert ON checkpoint_responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY checkpoint_responses_self_update ON checkpoint_responses
  FOR UPDATE USING (user_id = current_setting('app.user_id', true));

DROP POLICY IF EXISTS worksheet_presence_self       ON worksheet_presence;
DROP POLICY IF EXISTS worksheet_presence_admin_read ON worksheet_presence;

CREATE POLICY worksheet_presence_self ON worksheet_presence
  FOR ALL USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY worksheet_presence_admin_read ON worksheet_presence
  FOR SELECT USING (current_setting('app.user_role', true) = 'admin');

DROP POLICY IF EXISTS quiz_sessions_student_read ON quiz_sessions;
DROP POLICY IF EXISTS quiz_sessions_admin_all    ON quiz_sessions;

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

DROP POLICY IF EXISTS quiz_participants_self    ON quiz_participants;
DROP POLICY IF EXISTS quiz_participants_admin   ON quiz_participants;

CREATE POLICY quiz_participants_self ON quiz_participants
  FOR ALL USING (user_id = current_setting('app.user_id', true))
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY quiz_participants_admin ON quiz_participants
  FOR ALL USING (current_setting('app.user_role', true) = 'admin');

DROP POLICY IF EXISTS quiz_responses_self_read   ON quiz_responses;
DROP POLICY IF EXISTS quiz_responses_self_insert ON quiz_responses;
DROP POLICY IF EXISTS quiz_responses_admin_all   ON quiz_responses;

CREATE POLICY quiz_responses_self_read ON quiz_responses
  FOR SELECT USING (user_id = current_setting('app.user_id', true));

CREATE POLICY quiz_responses_self_insert ON quiz_responses
  FOR INSERT WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY quiz_responses_admin_all ON quiz_responses
  FOR ALL USING (current_setting('app.user_role', true) = 'admin');

-- ============================================================
-- 15) Views (must precede functions that reference them)
-- ============================================================

CREATE OR REPLACE VIEW v_course_dto AS
SELECT
  c.course_id                                                                   AS id,
  CASE WHEN cv.variant_short IS NOT NULL
       THEN s.subject_label || ' (' || cv.variant_short || ')'
       ELSE s.subject_label
  END                                                                            AS label,
  g.group_label                                                                  AS description,
  g.group_key,
  g.group_label,
  s.subject_id,
  s.subject_label,
  c.slug,
  c.icon,
  c.color,
  c.is_listed,
  c.is_public,
  c.registration_open_until,
  ARRAY[g.group_label, s.subject_label]                                          AS tags
FROM courses c
JOIN groups g           ON g.group_id   = c.group_id
JOIN subjects s         ON s.subject_id = c.subject_id
LEFT JOIN course_variants cv ON cv.variant_id = c.variant_id;

CREATE OR REPLACE VIEW v_user_dto AS
SELECT
  u.id,
  u.role,
  u.group_key,
  COALESCE(
    ARRAY_AGG(uc.course_id) FILTER (WHERE uc.course_id IS NOT NULL),
    ARRAY[]::TEXT[]
  ) AS course_ids
FROM users u
LEFT JOIN user_courses uc ON uc.user_id = u.id
GROUP BY u.id, u.role, u.group_key;

CREATE OR REPLACE VIEW v_worksheets_by_chapter AS
SELECT
  cw.course_id,
  cw.topic_id,
  cw.chapter_id,
  cw.worksheet_id,
  w.label,
  CASE
    WHEN w.worksheet_format IN ('pdf', 'pdfSolution')
    THEN CONCAT('/.generated/pdf/', c.subject_id, '/', cw.topic_id, '/', cw.chapter_id, '/worksheets/', cw.worksheet_id, '.pdf')
    ELSE CONCAT(c.slug, '/', t.href_slug, '/', ch.href_slug, '/', w.href_slug)
  END                 AS href,
  CASE
    WHEN w.worksheet_format = 'pdfSolution'
    THEN CONCAT('/.generated/pdf/', c.subject_id, '/', cw.topic_id, '/', cw.chapter_id, '/worksheets/', cw.worksheet_id, '-solution.pdf')
    ELSE NULL
  END                 AS solution_href,
  w.worksheet_format,
  cw.is_hidden,
  cw.is_solution_hidden,
  cw.display_order
FROM course_worksheets cw
JOIN worksheets w  ON w.worksheet_id  = cw.worksheet_id
JOIN courses c     ON c.course_id     = cw.course_id
JOIN topics t      ON t.topic_id      = cw.topic_id
JOIN chapters ch   ON ch.chapter_id   = cw.chapter_id;

-- ============================================================
-- 16) Functions
-- ============================================================

CREATE OR REPLACE FUNCTION generate_access_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  a          CONSTANT INTEGER := 31;
  b          CONSTANT INTEGER := 23;
  word_count CONSTANT INTEGER := 101;
  max_tries  CONSTANT INTEGER := word_count * 99;
  n          BIGINT;
  word_index INTEGER;
  word       TEXT;
  num        TEXT;
  v_code     TEXT;
  i          INTEGER;
BEGIN
  FOR i IN 1..max_tries LOOP
    n := nextval('public.access_code_counter');
    word_index := ((a * n) % word_count)::INTEGER;

    SELECT acw.word
    INTO word
    FROM public.access_code_words acw
    WHERE acw.pos = word_index;

    IF word IS NULL THEN
      RAISE EXCEPTION 'Missing word at index % (must be contiguous 0..%)',
        word_index, word_count - 1;
    END IF;

    num := LPAD((((b * n) % 99) + 1)::TEXT, 2, '0');
    v_code := word || num;

    IF NOT EXISTS (
      SELECT 1 FROM public.users u WHERE u.access_code = v_code
    ) THEN
      RETURN v_code;
    END IF;
  END LOOP;

  RAISE EXCEPTION 'No unused access code available in current cycle (word_count=%)', word_count;
END;
$$;

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
    DELETE FROM public.auth_attempts WHERE bucket_key = p_bucket_key;
    RETURN jsonb_build_object('allowed', true);
  END IF;

  SELECT * INTO v_bucket FROM public.auth_attempts
  WHERE bucket_key = p_bucket_key FOR UPDATE;

  IF NOT FOUND THEN
    BEGIN
      INSERT INTO public.auth_attempts (bucket_key, attempt_count, window_start)
      VALUES (p_bucket_key, 1, v_now);
      RETURN jsonb_build_object('allowed', true, 'attempts', 1);
    EXCEPTION
      WHEN unique_violation THEN
        SELECT * INTO v_bucket FROM public.auth_attempts
        WHERE bucket_key = p_bucket_key FOR UPDATE;
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
    SET attempt_count = 1, window_start = v_now, locked_until = NULL
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
  RETURNING attempt_count INTO v_bucket.attempt_count;

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

CREATE OR REPLACE FUNCTION create_user_account(
  p_user_id     TEXT,
  p_access_code TEXT,
  p_pin_hash    TEXT,
  p_group_key   TEXT,
  p_course_ids  TEXT[]
)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH inserted_user AS (
    INSERT INTO public.users (id, role, group_key, access_code, pin_hash)
    VALUES (p_user_id, 'user', p_group_key, p_access_code, p_pin_hash)
    RETURNING id
  ),
  requested_courses AS (
    SELECT DISTINCT requested.course_id
    FROM unnest(COALESCE(p_course_ids, ARRAY[]::TEXT[])) AS requested(course_id)
    WHERE requested.course_id IS NOT NULL
  )
  INSERT INTO public.user_courses (user_id, course_id)
  SELECT iu.id, rc.course_id
  FROM inserted_user iu
  JOIN requested_courses rc ON TRUE
  ON CONFLICT (user_id, course_id) DO NOTHING;
$$;

CREATE OR REPLACE FUNCTION create_user_with_code(
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
  v_code            TEXT;
  v_attempts        INTEGER := 0;
  v_constraint_name TEXT;
BEGIN
  LOOP
    v_attempts := v_attempts + 1;
    IF v_attempts > 100 THEN
      RAISE EXCEPTION 'Failed to create user with a unique access code after 100 attempts';
    END IF;

    v_code := public.generate_access_code();

    BEGIN
      PERFORM public.create_user_account(
        p_user_id, v_code, p_pin_hash, p_group_key, ARRAY[]::TEXT[]
      );
      RETURN v_code;
    EXCEPTION
      WHEN unique_violation THEN
        GET STACKED DIAGNOSTICS v_constraint_name = CONSTRAINT_NAME;
        IF v_constraint_name = 'users_access_code_key' THEN
          CONTINUE;
        END IF;
        RAISE;
    END;
  END LOOP;
END;
$$;

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

CREATE OR REPLACE FUNCTION update_course_progress(
  p_course_id      TEXT,
  p_new_topic_id   TEXT,
  p_new_chapter_id TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_topic_order   INTEGER;
  v_chapter_order INTEGER;
BEGIN
  SELECT ct.display_order INTO v_topic_order
  FROM public.course_topics ct
  WHERE ct.course_id = p_course_id AND ct.topic_id = p_new_topic_id;

  IF v_topic_order IS NULL THEN
    RAISE EXCEPTION 'Topic % is not part of course %', p_new_topic_id, p_course_id
      USING ERRCODE = '22023';
  END IF;

  SELECT cc.display_order INTO v_chapter_order
  FROM public.course_chapters cc
  WHERE cc.course_id = p_course_id
    AND cc.topic_id = p_new_topic_id
    AND cc.chapter_id = p_new_chapter_id;

  IF v_chapter_order IS NULL THEN
    RAISE EXCEPTION 'Chapter % is not part of topic % in course %',
      p_new_chapter_id, p_new_topic_id, p_course_id
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.course_topics SET status = 'locked'
  WHERE course_id = p_course_id AND status = 'current';

  UPDATE public.course_topics ct
  SET status = CASE
    WHEN ct.display_order < v_topic_order THEN 'finished'
    WHEN ct.topic_id = p_new_topic_id THEN 'current'
    WHEN ct.display_order = v_topic_order + 1 THEN 'planned'
    ELSE 'locked'
  END
  WHERE ct.course_id = p_course_id;

  UPDATE public.course_chapters SET status = 'locked'
  WHERE course_id = p_course_id AND status = 'current';

  UPDATE public.course_chapters cc
  SET status = CASE
    WHEN ct.display_order < v_topic_order THEN 'finished'
    WHEN cc.topic_id = p_new_topic_id AND cc.chapter_id = p_new_chapter_id THEN 'current'
    WHEN cc.topic_id = p_new_topic_id AND cc.display_order < v_chapter_order THEN 'finished'
    ELSE 'locked'
  END
  FROM public.course_topics ct
  WHERE ct.course_id = cc.course_id
    AND ct.topic_id = cc.topic_id
    AND cc.course_id = p_course_id;

  UPDATE public.courses SET updated_at = NOW() WHERE course_id = p_course_id;
END;
$$;

CREATE OR REPLACE FUNCTION get_session_user(p_user_id TEXT)
RETURNS TABLE (
  id         TEXT,
  role       TEXT,
  group_key  TEXT,
  course_ids TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH selected_user AS (
    SELECT u.id, u.role, u.group_key FROM public.users u WHERE u.id = p_user_id
  ),
  user_courses_agg AS (
    SELECT uc.user_id, array_agg(uc.course_id ORDER BY uc.course_id) AS course_ids
    FROM public.user_courses uc WHERE uc.user_id = p_user_id GROUP BY uc.user_id
  )
  SELECT su.id, su.role, su.group_key, COALESCE(uca.course_ids, ARRAY[]::TEXT[]) AS course_ids
  FROM selected_user su LEFT JOIN user_courses_agg uca ON uca.user_id = su.id;
$$;

CREATE OR REPLACE FUNCTION get_user_for_login(p_access_code TEXT)
RETURNS TABLE (
  id          TEXT,
  role        TEXT,
  group_key   TEXT,
  access_code TEXT,
  pin_hash    TEXT,
  course_ids  TEXT[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  WITH selected_user AS (
    SELECT u.id, u.role, u.group_key, u.access_code, u.pin_hash
    FROM public.users u WHERE LOWER(u.access_code) = LOWER(p_access_code)
  ),
  user_courses_agg AS (
    SELECT uc.user_id, array_agg(uc.course_id ORDER BY uc.course_id) AS course_ids
    FROM public.user_courses uc JOIN selected_user su ON su.id = uc.user_id GROUP BY uc.user_id
  )
  SELECT su.id, su.role, su.group_key, su.access_code, su.pin_hash,
         COALESCE(uca.course_ids, ARRAY[]::TEXT[]) AS course_ids
  FROM selected_user su LEFT JOIN user_courses_agg uca ON uca.user_id = su.id;
$$;

CREATE OR REPLACE FUNCTION get_user_access_code(p_user_id TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT u.access_code FROM public.users u WHERE u.id = p_user_id;
$$;

CREATE OR REPLACE FUNCTION set_registration_open_until(p_course_id TEXT, p_open_until TIMESTAMPTZ)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  UPDATE public.courses c
  SET registration_open_until = p_open_until, updated_at = NOW()
  WHERE c.course_id = p_course_id;
$$;

CREATE OR REPLACE FUNCTION get_progress_dto(p_course_id TEXT)
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH course_base AS (
  SELECT c.course_id, c.slug FROM public.courses c WHERE c.course_id = p_course_id
),
topic_rows AS (
  SELECT ct.course_id, ct.topic_id, t.label AS topic_label,
         CONCAT(cb.slug, '/', t.href_slug) AS topic_href,
         ct.status AS topic_status, ct.display_order AS topic_order
  FROM public.course_topics ct
  JOIN public.topics t ON t.topic_id = ct.topic_id
  JOIN course_base cb ON cb.course_id = ct.course_id
),
chapter_rows AS (
  SELECT cc.course_id, cc.topic_id, cc.chapter_id, ch.label AS chapter_label,
         CONCAT(cb.slug, '/', t.href_slug, '/', ch.href_slug) AS chapter_href,
         cc.status AS chapter_status, cc.display_order AS chapter_order
  FROM public.course_chapters cc
  JOIN public.chapters ch ON ch.chapter_id = cc.chapter_id
  JOIN public.topics t ON t.topic_id = cc.topic_id
  JOIN course_base cb ON cb.course_id = cc.course_id
),
current_ids AS (
  SELECT
    COALESCE((SELECT tr.topic_id FROM topic_rows tr WHERE tr.topic_status = 'current'), '') AS current_topic_id,
    COALESCE((SELECT cr.chapter_id FROM chapter_rows cr WHERE cr.chapter_status = 'current'), '') AS current_chapter_id
),
worksheets_by_chapter AS (
  SELECT w.course_id, w.topic_id, w.chapter_id,
    jsonb_agg(
      jsonb_build_object(
        'worksheetId', w.worksheet_id, 'label', w.label,
        'href', w.href, 'worksheetFormat', w.worksheet_format
      ) ORDER BY w.display_order, w.worksheet_id
    ) AS worksheets
  FROM public.v_worksheets_by_chapter w
  WHERE w.course_id = p_course_id AND w.is_hidden = false
  GROUP BY w.course_id, w.topic_id, w.chapter_id
),
chapters_with_worksheets AS (
  SELECT cr.course_id, cr.topic_id, cr.chapter_order, cr.chapter_id,
    jsonb_build_object(
      'chapterId', cr.chapter_id, 'label', cr.chapter_label,
      'href', cr.chapter_href, 'status', cr.chapter_status,
      'worksheets', COALESCE(wbc.worksheets, '[]'::jsonb)
    ) AS chapter_obj
  FROM chapter_rows cr
  LEFT JOIN worksheets_by_chapter wbc
    ON wbc.course_id = cr.course_id AND wbc.topic_id = cr.topic_id AND wbc.chapter_id = cr.chapter_id
),
chapters_by_topic AS (
  SELECT cww.course_id, cww.topic_id,
    jsonb_agg(cww.chapter_obj ORDER BY cww.chapter_order, cww.chapter_id) AS chapters
  FROM chapters_with_worksheets cww GROUP BY cww.course_id, cww.topic_id
),
topics_with_chapters AS (
  SELECT tr.course_id, tr.topic_order, tr.topic_id,
    jsonb_build_object(
      'topicId', tr.topic_id, 'label', tr.topic_label,
      'href', tr.topic_href, 'status', tr.topic_status,
      'chapters', COALESCE(cbt.chapters, '[]'::jsonb)
    ) AS topic_obj
  FROM topic_rows tr
  LEFT JOIN chapters_by_topic cbt ON cbt.course_id = tr.course_id AND cbt.topic_id = tr.topic_id
),
topics_agg AS (
  SELECT twc.course_id,
    jsonb_agg(twc.topic_obj ORDER BY twc.topic_order, twc.topic_id) AS topics
  FROM topics_with_chapters twc GROUP BY twc.course_id
)
SELECT jsonb_build_object(
  'currentTopicId', ci.current_topic_id,
  'currentChapterId', ci.current_chapter_id,
  'topics', COALESCE(ta.topics, '[]'::jsonb)
)
FROM current_ids ci LEFT JOIN topics_agg ta ON TRUE;
$$;

CREATE OR REPLACE FUNCTION get_course_access_groups()
RETURNS JSONB
LANGUAGE sql
STABLE
AS $$
WITH session_context AS (
  SELECT
    current_setting('app.user_role', true) AS user_role,
    current_setting('app.user_id', true)   AS user_id,
    current_setting('app.group_key', true) AS group_key
),
course_access AS (
  SELECT
    c.id, c.is_listed, c.is_public,
    (sc.user_role = 'admin' OR c.group_key = sc.group_key OR uc.user_id IS NOT NULL) AS is_accessible
  FROM public.v_course_dto c
  CROSS JOIN session_context sc
  LEFT JOIN public.user_courses uc ON uc.course_id = c.id AND uc.user_id = sc.user_id
)
SELECT jsonb_build_object(
  'public', COALESCE(jsonb_agg(ca.id ORDER BY ca.id) FILTER (WHERE ca.is_listed AND ca.is_public), '[]'::jsonb),
  'accessible', COALESCE(jsonb_agg(ca.id ORDER BY ca.id) FILTER (WHERE ca.is_listed AND NOT ca.is_public AND ca.is_accessible), '[]'::jsonb),
  'restricted', COALESCE(jsonb_agg(ca.id ORDER BY ca.id) FILTER (WHERE ca.is_listed AND NOT ca.is_public AND NOT ca.is_accessible), '[]'::jsonb),
  'hidden', COALESCE(jsonb_agg(ca.id ORDER BY ca.id) FILTER (WHERE NOT ca.is_listed), '[]'::jsonb)
)
FROM course_access ca;
$$;

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
  SELECT phase, current_index INTO v_phase, v_current_index
  FROM quiz_sessions WHERE session_id = p_session_id;

  IF v_phase IS DISTINCT FROM 'active' THEN RETURN; END IF;
  IF v_current_index IS DISTINCT FROM p_question_index THEN RETURN; END IF;

  SELECT COUNT(*) INTO v_participant_count
  FROM quiz_participants WHERE session_id = p_session_id;

  SELECT COUNT(*) INTO v_response_count
  FROM quiz_responses WHERE session_id = p_session_id AND question_index = p_question_index;

  IF v_participant_count > 0 AND v_response_count >= v_participant_count THEN
    UPDATE quiz_sessions
    SET phase = 'reveal_dist', updated_at = now()
    WHERE session_id = p_session_id AND phase = 'active';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION get_quiz_broadcast_data(p_session_id TEXT)
RETURNS TABLE (
  session_id       TEXT,
  course_id        TEXT,
  phase            TEXT,
  questions        JSONB,
  current_index    INTEGER,
  timer_seconds    INTEGER,
  timer_started_at TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ,
  created_at       TIMESTAMPTZ,
  participant_count INTEGER,
  responses        JSON
)
SECURITY DEFINER
SET search_path = public
LANGUAGE sql
AS $$
  SELECT
    s.session_id, s.course_id, s.phase, s.questions, s.current_index,
    s.timer_seconds, s.timer_started_at, s.updated_at, s.created_at,
    (SELECT COUNT(*)::int FROM quiz_participants p WHERE p.session_id = s.session_id),
    COALESCE(
      (SELECT json_agg(r.selected) FROM quiz_responses r
       WHERE r.session_id = s.session_id AND r.question_index = s.current_index),
      '[]'::json
    )
  FROM quiz_sessions s WHERE s.session_id = p_session_id;
$$;
