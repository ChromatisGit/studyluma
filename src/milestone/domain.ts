import type { User } from "@chromatis/base/auth";
import { getDatabase, notFound, type WebsiteLoadContext } from "./server";

export type Course = { id: string; title: string };
export type Chapter = { id: string; title: string; body: string; topic_id: string; topic_title: string };
export type Worksheet = { id: string; title: string; body: string; public_key: string; chapter_id: string };

export async function listCourses(user: User, context: WebsiteLoadContext): Promise<Course[]> {
  return getDatabase(context).userSQL(user)<Course[]>`SELECT id, title FROM courses ORDER BY title`;
}

export async function getCourse(user: User, courseId: string, context: WebsiteLoadContext): Promise<Course> {
  const [course] = await getDatabase(context).userSQL(user)<Course[]>`SELECT id, title FROM courses WHERE id = ${courseId}`;
  return course ?? notFound();
}

export async function listCourseChapters(user: User, courseId: string, context: WebsiteLoadContext): Promise<Chapter[]> {
  return getDatabase(context).userSQL(user)<Chapter[]>`
    SELECT ch.id, ch.title, ch.body, ch.topic_id, t.title AS topic_title
    FROM course_chapters cc JOIN chapters ch ON ch.id = cc.chapter_id
    JOIN topics t ON t.id = ch.topic_id
    WHERE cc.course_id = ${courseId}
    ORDER BY t.title, ch.title
  `;
}

export async function getCourseChapter(user: User, courseId: string, topicId: string, chapterId: string, context: WebsiteLoadContext): Promise<Chapter> {
  const [chapter] = await getDatabase(context).userSQL(user)<Chapter[]>`
    SELECT ch.id, ch.title, ch.body, ch.topic_id, t.title AS topic_title
    FROM course_chapters cc JOIN chapters ch ON ch.id = cc.chapter_id
    JOIN topics t ON t.id = ch.topic_id
    WHERE cc.course_id = ${courseId} AND ch.topic_id = ${topicId} AND ch.id = ${chapterId}
  `;
  return chapter ?? notFound();
}

export async function listChapterWorksheets(chapterId: string, context: WebsiteLoadContext): Promise<Worksheet[]> {
  return getDatabase(context).anonSQL<Worksheet[]>`SELECT id, title, body, public_key::text, chapter_id FROM worksheets WHERE chapter_id = ${chapterId} ORDER BY title`;
}

export async function getWorksheetForUser(user: User, publicKey: string, context: WebsiteLoadContext): Promise<Worksheet> {
  const [worksheet] = await getDatabase(context).userSQL(user)<Worksheet[]>`
    SELECT w.id, w.title, w.body, w.public_key::text, w.chapter_id
    FROM worksheets w JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    WHERE w.public_key = ${publicKey}::uuid
    LIMIT 1
  `;
  return worksheet ?? notFound();
}

export async function getResponse(user: User, worksheetId: string, context: WebsiteLoadContext): Promise<string> {
  const [row] = await getDatabase(context).userSQL(user)<Array<{ answer: string }>>`
    SELECT answer FROM worksheet_responses WHERE user_id = ${user.id}::uuid AND worksheet_id = ${worksheetId}
  `;
  return row?.answer ?? "";
}

export async function saveResponse(user: User, worksheetId: string, answer: string, context: WebsiteLoadContext): Promise<void> {
  await getDatabase(context).userSQL(user)`
    INSERT INTO worksheet_responses (user_id, worksheet_id, answer)
    VALUES (${user.id}::uuid, ${worksheetId}, ${answer})
    ON CONFLICT (user_id, worksheet_id) DO UPDATE SET answer = EXCLUDED.answer, updated_at = now()
  `;
}
