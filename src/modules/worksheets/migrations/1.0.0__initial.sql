CREATE TABLE worksheets (
  id text PRIMARY KEY,
  chapter_id text NOT NULL REFERENCES chapters(id),
  public_key uuid NOT NULL UNIQUE,
  title text NOT NULL,
  body text NOT NULL
);

CREATE TABLE worksheet_responses (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  worksheet_id text NOT NULL REFERENCES worksheets(id),
  answer text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, worksheet_id)
);


ALTER TABLE worksheet_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY worksheet_responses_read ON worksheet_responses FOR SELECT USING (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM worksheets w
    JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    JOIN course_enrollments e ON e.course_id = cc.course_id
    WHERE w.id = worksheet_responses.worksheet_id
      AND e.user_id = worksheet_responses.user_id
  )
);
CREATE POLICY worksheet_responses_insert ON worksheet_responses FOR INSERT WITH CHECK (
  user_id = nullif(current_setting('app.user_id', true), '')::uuid
  AND EXISTS (
    SELECT 1 FROM worksheets w
    JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    JOIN course_enrollments e ON e.course_id = cc.course_id
    WHERE w.id = worksheet_responses.worksheet_id
      AND e.user_id = worksheet_responses.user_id
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
    WHERE w.id = worksheet_responses.worksheet_id
      AND e.user_id = worksheet_responses.user_id
  )
);

REVOKE ALL ON worksheets, worksheet_responses FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON worksheets TO chromatis_app;
GRANT SELECT, INSERT, UPDATE ON worksheet_responses TO chromatis_app;
