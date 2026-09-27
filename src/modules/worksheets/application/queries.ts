import type { User } from "@chromatis/base/auth";
import type { Database } from "@chromatis/base/database";

export type Worksheet = {
  id: string;
  title: string;
  body: string;
  public_key: string;
  chapter_id: string;
  course_id?: string;
  topic_id?: string;
};

export async function listChapterWorksheets(
  chapterId: string,
  database: Database,
): Promise<Worksheet[]> {
  return database.anonSQL<
    Worksheet[]
  >`SELECT id, title, body, public_key::text, chapter_id FROM worksheets WHERE chapter_id = ${chapterId} ORDER BY title`;
}

export async function getWorksheetForUser(
  user: User,
  publicKey: string,
  database: Database,
): Promise<Worksheet | undefined> {
  const [worksheet] = await database.userSQL(user)<Worksheet[]>`
    SELECT w.id, w.title, w.body, w.public_key::text, w.chapter_id,
           cc.course_id, ch.topic_id
    FROM worksheets w JOIN course_chapters cc ON cc.chapter_id = w.chapter_id
    JOIN chapters ch ON ch.id = w.chapter_id
    WHERE w.public_key = ${publicKey}::uuid
    LIMIT 1
  `;
  return worksheet;
}

export async function getResponse(
  user: User,
  worksheetId: string,
  database: Database,
): Promise<string> {
  const [row] = await database.userSQL(user)<Array<{ answer: string }>>`
    SELECT answer FROM worksheet_responses WHERE user_id = ${user.id}::uuid AND worksheet_id = ${worksheetId}
  `;
  return row?.answer ?? "";
}

export async function saveResponse(
  user: User,
  worksheetId: string,
  answer: string,
  database: Database,
): Promise<void> {
  await database.userSQL(user)`
    INSERT INTO worksheet_responses (user_id, worksheet_id, answer)
    VALUES (${user.id}::uuid, ${worksheetId}, ${answer})
    ON CONFLICT (user_id, worksheet_id) DO UPDATE SET answer = EXCLUDED.answer, updated_at = now()
  `;
}
