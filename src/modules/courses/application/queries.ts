import type { User } from "@chromatis/base/auth";
import type { Database } from "@chromatis/base/database";

export type Course = { id: string; title: string };
export async function listCourses(
  user: User,
  database: Database,
): Promise<Course[]> {
  return database.userSQL(user)<
    Course[]
  >`SELECT id, title FROM courses ORDER BY title`;
}

export async function getCourse(
  user: User,
  courseId: string,
  database: Database,
): Promise<Course | undefined> {
  const [course] = await database.userSQL(user)<
    Course[]
  >`SELECT id, title FROM courses WHERE id = ${courseId}`;
  return course;
}
