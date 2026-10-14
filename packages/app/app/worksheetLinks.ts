import { chapterPath } from "../src/modules/courses";
import type { WorksheetLinks } from "../src/modules/worksheets";

/** Where the worksheet pages of a chapter live. */
export function worksheetLinks(
  courseId: string,
  chapterSlug: string,
): WorksheetLinks {
  const chapter = chapterPath(courseId, chapterSlug);
  return {
    chapter,
    summary: chapter,
    challenges: `${chapter}/challenges`,
    sheet: (sheetSlug) => `${chapter}/sheets/${encodeURIComponent(sheetSlug)}`,
  };
}
