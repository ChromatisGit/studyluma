import type { Chapter } from "../domain/contract";
import chapter92 from "./fixtures/9-2.json";

/**
 * Worksheet chapters from JSON fixtures in the format of the data
 * contract. The pipeline and a database replace this file later.
 */
const chapters: Record<string, Chapter> = {
  "9-2": chapter92 as Chapter,
};

/**
 * The chapter for a viewer. Prototype limitation: solutions stay in the
 * payload for students, because the teacher's release lives in this
 * browser. With a backend, locked solutions never leave the server.
 */
export function getWorksheetChapter(
  chapterId: string,
  viewer: Chapter["viewer"],
): Chapter | undefined {
  const chapter = chapters[chapterId];
  return chapter ? { ...chapter, viewer } : undefined;
}

export function hasWorksheets(chapterId: string): boolean {
  return chapterId in chapters;
}
