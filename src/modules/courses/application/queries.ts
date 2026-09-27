import type { User } from "@chromatis/base/auth";
import type { Database } from "@chromatis/base/database";

export type Course = {
  id: string;
  title: string;
  current_chapter_id: string | null;
};
export async function listCourses(
  user: User,
  database: Database,
): Promise<Course[]> {
  return database.userSQL(user)<
    Course[]
  >`SELECT id, title, current_chapter_id FROM courses ORDER BY title`;
}

export async function getCourse(
  user: User,
  courseId: string,
  database: Database,
): Promise<Course | undefined> {
  const [course] = await database.userSQL(user)<
    Course[]
  >`SELECT id, title, current_chapter_id FROM courses WHERE id = ${courseId}`;
  return course;
}

export type TeacherWorksheet = {
  id: string;
  title: string;
  chapter_id: string;
  chapter_title: string;
  is_locked: boolean;
};

export async function canManageCourses(user: User, database: Database) {
  const [row] = await database.userSQL(user)<Array<{ allowed: boolean }>>`
    SELECT chromatis.has_permission(${user.id}::uuid, 'courses.manage') AS allowed
  `;
  return row?.allowed === true;
}

export async function listTeacherWorksheets(
  user: User,
  courseId: string,
  database: Database,
): Promise<TeacherWorksheet[]> {
  return database.userSQL(user)<TeacherWorksheet[]>`
    SELECT w.id, w.title, ch.id AS chapter_id, ch.title AS chapter_title,
           COALESCE(wl.is_locked, false) AS is_locked
    FROM course_chapters cc
    JOIN chapters ch ON ch.id = cc.chapter_id
    JOIN worksheets w ON w.chapter_id = ch.id
    LEFT JOIN worksheet_locks wl ON wl.worksheet_id = w.id
    WHERE cc.course_id = ${courseId}
    ORDER BY ch.title, w.title
  `;
}

export async function setCurrentChapter(
  user: User,
  courseId: string,
  chapterId: string,
  database: Database,
): Promise<boolean> {
  const rows = await database.userSQL(user)<Array<{ id: string }>>`
    UPDATE courses SET current_chapter_id = ${chapterId}
    WHERE id = ${courseId}
      AND EXISTS (SELECT 1 FROM course_chapters cc WHERE cc.course_id = ${courseId} AND cc.chapter_id = ${chapterId})
    RETURNING id
  `;
  return rows.length === 1;
}

export async function setWorksheetLocked(
  user: User,
  courseId: string,
  worksheetId: string,
  isLocked: boolean,
  database: Database,
): Promise<boolean> {
  const rows = await database.userSQL(user)<Array<{ worksheet_id: string }>>`
    INSERT INTO worksheet_locks (worksheet_id, is_locked)
    SELECT w.id, ${isLocked} FROM worksheets w
    JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    WHERE cc.course_id = ${courseId} AND w.id = ${worksheetId}
    ON CONFLICT (worksheet_id) DO UPDATE SET is_locked = EXCLUDED.is_locked
    RETURNING worksheet_id
  `;
  return rows.length === 1;
}
