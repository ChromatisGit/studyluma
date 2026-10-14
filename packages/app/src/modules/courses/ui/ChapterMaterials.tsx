import { SheetCards, type SheetsData } from "../../worksheets";
import { chapterPath } from "../application/navigation";
import TEXT from "./courses.de.json";

/** The chapter's worksheets, followed by its challenge pool. */
export function ChapterMaterials({
  courseId,
  chapterSlug,
  chapter,
  availableOnly = false,
}: {
  courseId: string;
  chapterSlug: string;
  /** The chapter's worksheets, as the reader may see them. */
  chapter: SheetsData | undefined;
  availableOnly?: boolean;
}) {
  if (!chapter) {
    return null;
  }
  const base = chapterPath(courseId, chapterSlug);
  return (
    <section
      className="content-section"
      aria-labelledby="arbeitsblaetter-title"
    >
      <h2 className="h2" id="arbeitsblaetter-title">
        {TEXT.chapter.worksheets}
      </h2>
      <SheetCards
        chapter={chapter}
        viewer="student"
        availableOnly={availableOnly}
        links={{
          chapter: base,
          sheet: (slug) => `${base}/sheets/${encodeURIComponent(slug)}`,
          challenges: `${base}/challenges`,
          summary: base,
        }}
      />
    </section>
  );
}
