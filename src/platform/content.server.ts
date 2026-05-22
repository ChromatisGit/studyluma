import { anonSQL } from "./db.server.js";
import type { Page } from "@schema/page";
import type { TypedSlideDeck } from "@schema/slideTypes";

type ChapterContentRef = {
  subject: string;
  topicId: string;
  chapterId: string;
};

type WorksheetContentRef = ChapterContentRef & {
  worksheetId: string;
};

type SlideDeckRef = ChapterContentRef & {
  slideId: string;
};

export async function getContentPage<T = Page>(contentKey: string): Promise<T | null> {
  const rows = await anonSQL<{ content_json: T }[]>`
    SELECT content_json
    FROM content_pages
    WHERE content_key = ${contentKey}
  `;

  return rows[0]?.content_json ?? null;
}

export async function getChapterContent(ref: ChapterContentRef): Promise<Page | null> {
  return getContentPage<Page>(chapterContentKey(ref));
}

export async function getWorksheetContent(ref: WorksheetContentRef): Promise<Page | null> {
  return getContentPage<Page>(worksheetContentKey(ref));
}

export async function getSlideDeckContent(ref: SlideDeckRef): Promise<TypedSlideDeck | null> {
  return getContentPage<TypedSlideDeck>(slideContentKey(ref));
}

export async function listSlideDeckContent(ref: ChapterContentRef): Promise<string[]> {
  const prefix = `slides:${ref.subject}:${ref.topicId}:${ref.chapterId}:`;
  const rows = await anonSQL<{ content_key: string }[]>`
    SELECT content_key
    FROM content_pages
    WHERE page_kind = 'slides'
      AND subject_id = ${ref.subject}
      AND topic_id = ${ref.topicId}
      AND chapter_id = ${ref.chapterId}
      AND content_key LIKE ${`${prefix}%`}
    ORDER BY title
  `;

  return rows.map((row) => row.content_key.slice(prefix.length));
}

function chapterContentKey(ref: ChapterContentRef): string {
  return `chapter:${ref.subject}:${ref.topicId}:${ref.chapterId}`;
}

function worksheetContentKey(ref: WorksheetContentRef): string {
  return `worksheet:${ref.subject}:${ref.topicId}:${ref.chapterId}:${ref.worksheetId}`;
}

function slideContentKey(ref: SlideDeckRef): string {
  return `slides:${ref.subject}:${ref.topicId}:${ref.chapterId}:${ref.slideId}`;
}
