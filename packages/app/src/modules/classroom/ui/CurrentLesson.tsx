import { useMemo, useSyncExternalStore } from "react";
import { fill } from "../../../helper/text";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { useSentTarget } from "../application/useSheetAccess";
import { isUnlocked, chapterStore, type SheetsData } from "../../worksheets";
import { useSite } from "./SiteContext";
import {
  ChapterMaterials,
  Pictogram,
  chapterPath,
  findChapter,
  type Course,
} from "../../courses";
import TEXT from "./classroom.de.json";

/**
 * The work students need when they open their course for a lesson.
 * `sheets` is the current chapter's outline (the loader's); what is unlocked
 * or released follows the site as it changes.
 */
export function CurrentLesson({
  course,
  sheets,
}: {
  course: Course;
  sheets: SheetsData | null;
}) {
  const chapterId = course.currentChapterId ?? "";
  const current = findChapter(course, chapterId);
  const site = useSite();
  const chapter = useMemo(
    () =>
      sheets && {
        ...sheets,
        releasedSolutions: site.releasedSolutions,
        sessionSheets: site.sessionSheets,
      },
    [sheets, site.releasedSolutions, site.sessionSheets],
  );
  const { active } = useSentTarget(course.id);
  const store = chapterStore(chapterId);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  if (!current) {
    return null;
  }

  const base = chapterPath(course.id, current.slug);
  const sheet = chapter?.sheets.find((item) => item.id === active?.id);
  const activeSheet =
    active?.chapterId === chapterId &&
    active.kind === "sheet" &&
    sheet &&
    chapter &&
    isUnlocked(chapter, sheet, state)
      ? sheet
      : undefined;

  return (
    <section
      className="current-lesson stack stack-500"
      aria-labelledby="current-lesson-title"
    >
      <header className="kapitel-head">
        <Pictogram
          icon={current.topic.icon}
          fallbackLabel={current.topic.title}
        />
        <div className="kapitel-head__text">
          <p className="kapitel-head__meta">{current.topic.title}</p>
          <h2 className="h2 kapitel-head__title" id="current-lesson-title">
            <Link to={base}>
              {current.number} {current.title}
            </Link>
          </h2>
        </div>
      </header>
      {activeSheet && (
        <Link
          className="current-lesson__continue"
          to={`${base}/sheets/${encodeURIComponent(activeSheet.slug)}`}
        >
          <span>
            {fill(TEXT.teacher.continueSheet, { title: activeSheet.title })}
          </span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
      {active?.chapterId === chapterId && active.kind === "quiz" && (
        <Link
          className="current-lesson__continue"
          to={`/courses/${encodeURIComponent(course.id)}/quiz`}
        >
          <span>{TEXT.teacher.continueQuiz}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
      <ChapterMaterials
        courseId={course.id}
        chapterSlug={current.slug}
        chapter={chapter ?? undefined}
        availableOnly
      />
    </section>
  );
}
