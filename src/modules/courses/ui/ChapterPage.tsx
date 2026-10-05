import type { ReactNode } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Badge, Breadcrumbs, Page } from "@chromatis/base/ui";
import { SummaryRenderer } from "../../content";
import {
  chapterPath,
  coursePath,
  findChapter,
  neighbours,
} from "../application/navigation";
import type { Course } from "../domain/course";
import { LinkCard } from "./LinkCard";
import { Pictogram } from "./Pictogram";
import TEXT from "./courses.de.json";

/** Previous and next chapter; the next one is a preview until reached. */
function ChapterNav({
  course,
  chapterId,
}: {
  course: Course;
  chapterId: string;
}) {
  const { previous, next } = neighbours(course, chapterId);
  if (!previous && !next) {
    return null;
  }
  return (
    <nav className="kapitel-nav" aria-label={TEXT.chapter.nav}>
      {previous ? (
        <LinkCard
          to={chapterPath(course.id, previous.id)}
          meta={TEXT.chapter.previous}
          title={`${previous.number} ${previous.title}`}
          cue={<ArrowLeft className="card__cue" aria-hidden="true" />}
        />
      ) : (
        <span />
      )}
      {next &&
        (next.reached ? (
          <LinkCard
            to={chapterPath(course.id, next.id)}
            meta={TEXT.chapter.next}
            title={`${next.number} ${next.title}`}
            cue={<ArrowRight className="card__cue" aria-hidden="true" />}
          />
        ) : (
          <div className="kapitel-nav__next">
            <span className="kapitel-nav__label">{TEXT.chapter.upcoming}</span>
            <span>
              {next.number} {next.title}
            </span>
          </div>
        ))}
    </nav>
  );
}

export interface ChapterPageProps {
  course: Course;
  chapterId: string;
  summary?: string | undefined;
  /** The chapter's worksheets, rendered by the worksheets module. */
  worksheets?: ReactNode;
  /** Teacher-only actions, e.g. starting the lesson frames. */
  teacherActions?: ReactNode;
  homeLabel: string;
  homePath: string;
}

/**
 * The chapter page: worksheets first, then the summary (Zusammenfassung),
 * then previous/next chapter. The next chapter is a quiet preview while
 * the class hasn't reached it.
 */
export function ChapterPage({
  course,
  chapterId,
  summary,
  worksheets,
  teacherActions,
  homeLabel,
  homePath,
}: ChapterPageProps) {
  const chapter = findChapter(course, chapterId);
  if (!chapter) {
    return null;
  }
  const heading = `${chapter.number} ${chapter.title}`;

  return (
    <Page title={heading} width="content" className="kapitel">
      <Breadcrumbs
        label={TEXT.breadcrumbs}
        items={[
          { label: homeLabel, to: homePath },
          { label: course.title, to: coursePath(course.id) },
          { label: heading },
        ]}
      />
      <header className="kapitel-head">
        <Pictogram
          id={chapter.topic.icon}
          fallbackLabel={chapter.topic.title}
        />
        <div className="kapitel-head__text">
          <p className="kapitel-head__meta">
            <span>{chapter.topic.title}</span>
            {chapter.current && (
              <Badge status="info">{TEXT.chapter.current}</Badge>
            )}
          </p>
          <h1 className="h1 kapitel-head__title">{heading}</h1>
        </div>
      </header>

      {teacherActions && (
        <section
          className="content-section kapitel-teacher"
          aria-label={TEXT.chapter.teacher}
        >
          {teacherActions}
        </section>
      )}

      {worksheets && (
        <section className="content-section" aria-labelledby="worksheets-title">
          <h2 id="worksheets-title" className="h2">
            {TEXT.chapter.worksheets}
          </h2>
          {worksheets}
        </section>
      )}

      {summary?.trim() && (
        <section
          className="content-section"
          id="zusammenfassung"
          aria-labelledby="summary-title"
        >
          <h2 id="summary-title" className="h2">
            {TEXT.chapter.summary}
          </h2>
          <SummaryRenderer markdown={summary} />
        </section>
      )}

      <ChapterNav course={course} chapterId={chapterId} />
    </Page>
  );
}
