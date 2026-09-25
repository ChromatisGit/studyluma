DROP POLICY worksheet_responses_read ON worksheet_responses;
DROP POLICY worksheet_responses_insert ON worksheet_responses;
DROP POLICY worksheet_responses_update ON worksheet_responses;

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
