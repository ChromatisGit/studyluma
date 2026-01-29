import "server-only";

import { query } from ".";
import type { CourseRow } from "./types";
import type { CourseState } from "@repo/types";

function toCourseState(row: CourseRow): CourseState {
  return {
    courseId: row.course_id,
    currentTopicId: row.current_topic_id,
    currentChapterId: row.current_chapter_id,
    registrationOpenUntil: row.registration_open_until,
  };
}

export async function getCourse(courseId: string): Promise<CourseState | null> {
  const rows = await query<CourseRow>`
    SELECT course_id, current_topic_id, current_chapter_id, registration_open_until
    FROM courses
    WHERE course_id = ${courseId}
    LIMIT 1
  `;
  const row = rows[0];
  return row ? toCourseState(row) : null;
}

export async function updateCourseProgress(courseId: string, topicId: string, chapterId: string): Promise<void> {
  await query`
    UPDATE courses
    SET current_topic_id = ${topicId}, current_chapter_id = ${chapterId}
    WHERE course_id = ${courseId}
  `;
}

export async function setRegistrationOpenUntil(courseId: string, openUntil: Date | null): Promise<void> {
  await query`
    UPDATE courses
    SET registration_open_until = ${openUntil}
    WHERE course_id = ${courseId}
  `;
}
