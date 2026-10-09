import { useMemo, useSyncExternalStore } from "react";
import { Link } from "react-router";
import { ArrowRight } from "lucide-react";
import { targetStore } from "../infrastructure/targetStore";
import { isUnlocked, chapterStore } from "../../worksheets";
import { useSite } from "./SiteContext";
import {
  ChapterMaterials,
  Pictogram,
  chapterPath,
  findChapter,
  sheetsFor,
  type Course,
} from "../../courses";

/** The work students need when they open their course for a lesson. */
export function CurrentLesson({ course }: { course: Course }) {
  const chapterId = course.currentChapterId ?? "";
  const current = findChapter(course, chapterId);
  const site = useSite();
  const chapter = useMemo(
    () => sheetsFor(site, course.id, chapterId),
    [site, course.id, chapterId],
  );
  const target = targetStore(course.id);
  const active = useSyncExternalStore(
    target.subscribe,
    target.getSnapshot,
    target.getServerSnapshot,
  );
  const store = chapterStore(chapterId);
  const state = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  if (!current) {
    return null;
  }

  const base = chapterPath(course.id, chapterId);
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
          to={`${base}/sheets/${encodeURIComponent(activeSheet.id)}`}
        >
          <span>Weiter mit Arbeitsblatt {activeSheet.title}</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
      {active?.chapterId === chapterId && active.kind === "quiz" && (
        <Link
          className="current-lesson__continue"
          to={`/courses/${encodeURIComponent(course.id)}/quiz`}
        >
          <span>Quiz fortsetzen</span>
          <ArrowRight aria-hidden="true" />
        </Link>
      )}
      <ChapterMaterials
        courseId={course.id}
        chapterId={chapterId}
        chapter={chapter}
        availableOnly
      />
    </section>
  );
}
