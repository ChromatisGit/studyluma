ALTER TABLE courses ADD COLUMN current_chapter_id text REFERENCES chapters(id);

INSERT INTO roles (key, description) VALUES ('teacher', 'StudyLuma teacher') ON CONFLICT DO NOTHING;
INSERT INTO role_permissions (role_key, permission_key) VALUES ('teacher', 'courses.manage') ON CONFLICT DO NOTHING;

CREATE TABLE worksheet_locks (
  worksheet_id text PRIMARY KEY REFERENCES worksheets(id) ON DELETE CASCADE,
  is_locked boolean NOT NULL DEFAULT false
);

ALTER TABLE worksheet_locks ENABLE ROW LEVEL SECURITY;
CREATE POLICY worksheet_locks_read ON worksheet_locks FOR SELECT USING (true);
CREATE POLICY worksheet_locks_write ON worksheet_locks FOR ALL USING (
  chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
) WITH CHECK (
  chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
);
CREATE POLICY courses_update_current_chapter ON courses FOR UPDATE USING (
  chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
) WITH CHECK (
  chromatis.has_permission(nullif(current_setting('app.user_id', true), '')::uuid, 'courses.manage')
);

GRANT UPDATE (current_chapter_id) ON courses TO chromatis_app;
REVOKE ALL ON worksheet_locks FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON worksheet_locks TO chromatis_app;

CREATE POLICY worksheet_responses_unlocked_insert ON worksheet_responses
  AS RESTRICTIVE FOR INSERT WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM worksheet_locks wl
      WHERE wl.worksheet_id = worksheet_responses.worksheet_id AND wl.is_locked
    )
  );
CREATE POLICY worksheet_responses_unlocked_update ON worksheet_responses
  AS RESTRICTIVE FOR UPDATE USING (true) WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM worksheet_locks wl
      WHERE wl.worksheet_id = worksheet_responses.worksheet_id AND wl.is_locked
    )
  );
