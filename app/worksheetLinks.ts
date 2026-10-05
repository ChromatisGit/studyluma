import { chapterPath } from "../src/modules/courses";
import type { WorksheetLinks } from "../src/modules/worksheets";

/** Where the worksheet pages of a chapter live. */
export function worksheetLinks(
  courseId: string,
  chapterId: string,
): WorksheetLinks {
  const chapter = chapterPath(courseId, chapterId);
  return {
    chapter,
    summary: chapter,
    challenges: `${chapter}/challenges`,
    sheet: (sheetId) => `${chapter}/sheets/${encodeURIComponent(sheetId)}`,
  };
}
