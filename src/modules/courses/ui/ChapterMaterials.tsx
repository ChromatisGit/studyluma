import { SheetCards, getWorksheetChapter } from "../../worksheets";
import { chapterPath } from "../application/navigation";

/** The chapter's worksheets, followed by its challenge pool. */
export function ChapterMaterials({
  courseId,
  chapterId,
  availableOnly = false,
}: {
  courseId: string;
  chapterId: string;
  availableOnly?: boolean;
}) {
  const chapter = getWorksheetChapter(chapterId, "student");
  if (!chapter) {
    return null;
  }
  const base = chapterPath(courseId, chapterId);
  return (
    <section
      className="content-section"
      aria-labelledby="arbeitsblaetter-title"
    >
      <h2 className="h2" id="arbeitsblaetter-title">
        Arbeitsblätter
      </h2>
      <SheetCards
        chapter={chapter}
        viewer="student"
        availableOnly={availableOnly}
        links={{
          chapter: base,
          sheet: (id) => `${base}/sheets/${encodeURIComponent(id)}`,
          challenges: `${base}/challenges`,
          summary: base,
        }}
      />
    </section>
  );
}
