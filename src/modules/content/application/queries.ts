import type { User } from "@chromatis/base/auth";
import type { Database } from "@chromatis/base/database";

export type Chapter = {
  id: string;
  title: string;
  body: string;
  topic_id: string;
  topic_title: string;
};
export type Worksheet = {
  id: string;
  title: string;
  body: string;
  public_key: string;
  chapter_id: string;
};

export async function listCourseChapters(
  user: User,
  courseId: string,
  database: Database,
): Promise<Chapter[]> {
  return database.userSQL(user)<Chapter[]>`
    SELECT ch.id, ch.title, ch.body, ch.topic_id, t.title AS topic_title
    FROM course_chapters cc JOIN chapters ch ON ch.id = cc.chapter_id
    JOIN topics t ON t.id = ch.topic_id
    WHERE cc.course_id = ${courseId}
    ORDER BY t.title, ch.title
  `;
}

export async function getCourseChapter(
  user: User,
  courseId: string,
  topicId: string,
  chapterId: string,
  database: Database,
): Promise<Chapter | undefined> {
  const [chapter] = await database.userSQL(user)<Chapter[]>`
    SELECT ch.id, ch.title, ch.body, ch.topic_id, t.title AS topic_title
    FROM course_chapters cc JOIN chapters ch ON ch.id = cc.chapter_id
    JOIN topics t ON t.id = ch.topic_id
    WHERE cc.course_id = ${courseId} AND ch.topic_id = ${topicId} AND ch.id = ${chapterId}
  `;
  return chapter;
}
