import type { PublicCatalog } from "../../catalog";
import type { Course } from "../domain/course";
import { sheetsData, type SheetsData } from "../../worksheets";
import { chapterPath, chaptersInOrder } from "./navigation";

/** What a chapter's worksheets are read from: content, courses and releases. */
export type SheetsSource = {
  catalog: PublicCatalog;
  courses: Course[];
  viewer: SheetsData["viewer"];
  releasedSolutions: string[];
};

/**
 * A chapter's worksheets as read in a course: numbered by the course, with
 * Merkkarte links that lead back into it.
 */
export function sheetsFor(
  site: SheetsSource,
  courseId: string,
  chapterId: string,
): SheetsData | undefined {
  const course = site.courses.find((item) => item.id === courseId);
  const entry = course
    ? chaptersInOrder(course).find((chapter) => chapter.id === chapterId)
    : undefined;
  if (!course || !entry) {
    return undefined;
  }
  return sheetsData(site.catalog, chapterId, {
    number: entry.number,
    viewer: site.viewer,
    releasedSolutions: site.releasedSolutions,
    describeChapter: (id) => {
      const other = chaptersInOrder(course).find(
        (chapter) => chapter.id === id,
      );
      return {
        origin: other ? `${other.number} · ${other.title}` : "",
        href: chapterPath(course.id, id),
      };
    },
  });
}
