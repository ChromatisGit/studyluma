import { useEffect } from "react";
import { Link } from "react-router";
import { useRevalidator } from "react-router";
import { Breadcrumbs, Page, PageHeader } from "@chromatis/base/ui";
import { SummaryContent } from "../../content-renderer";
import type { Summary } from "../../catalog";
import { TeacherLockNotice, type SheetsData } from "../../worksheets";
import {
  chapterPath,
  coursePath,
  findChapter,
  neighbours,
} from "../application/navigation";
import type { Course } from "../domain/course";
import { ChapterMaterials } from "./ChapterMaterials";
import { Pictogram } from "./Pictogram";
import TEXT from "./courses.de.json";

export interface ChapterPageProps {
  course: Course;
  chapterId: string;
  /** The chapter's worksheets, as the reader may see them. */
  sheets: SheetsData | undefined;
  summary: Summary | undefined;
  /** Whether the reader may read the summary yet. */
  summaryVisible: boolean;
  /** A teacher reads the summary the class has not been given yet. */
  summaryLockedForStudents?: boolean;
}

/** Full chapter resources, including the summary when it is available. */
export function ChapterPage({
  course,
  chapterId,
  sheets,
  summary,
  summaryVisible: visible,
  summaryLockedForStudents = false,
}: ChapterPageProps) {
  const revalidator = useRevalidator();
  const chapter = findChapter(course, chapterId);
  useEffect(() => {
    if (visible) {
      return;
    }
    const timer = window.setInterval(() => revalidator.revalidate(), 5000);
    return () => window.clearInterval(timer);
  }, [visible, revalidator]);
  if (!chapter) {
    return null;
  }
  const heading = `${chapter.number} ${chapter.title}`;
  const { previous, next } = neighbours(course, chapterId);

  return (
    <Page title={heading} width="content" className="kapitel stack stack-700">
      <PageHeader
        title={course.title}
        breadcrumbs={
          <Breadcrumbs
            label={TEXT.breadcrumbs}
            items={[
              { label: course.title, to: coursePath(course.id) },
              { label: heading },
            ]}
          />
        }
      />
      <header className="kapitel-head">
        <Pictogram
          icon={chapter.topic.icon}
          fallbackLabel={chapter.topic.title}
        />
        <div className="kapitel-head__text">
          <p className="kapitel-head__meta">{chapter.topic.title}</p>
          <h2 className="h2 kapitel-head__title">{heading}</h2>
        </div>
      </header>
      <ChapterMaterials
        courseId={course.id}
        chapterSlug={chapter.slug}
        chapter={sheets}
        availableOnly
      />
      {summary && visible && (
        <section
          className="content-section"
          id="inhalt"
          aria-labelledby="summary-title"
        >
          <h2 className="h2" id="summary-title">
            {summary.title}
          </h2>
          {summaryLockedForStudents && (
            <TeacherLockNotice>{TEXT.summaryTeacherLocked}</TeacherLockNotice>
          )}
          <SummaryContent summary={summary} />
        </section>
      )}
      {(previous || next) && (
        <nav className="kapitel-nav" aria-label={TEXT.chapter.nav}>
          {previous ? (
            <Link to={chapterPath(course.id, previous.slug)}>
              <span aria-hidden="true">←</span> {previous.number}{" "}
              {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next &&
            (next.reached ? (
              <Link to={chapterPath(course.id, next.slug)}>
                {next.number} {next.title} <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="kapitel-nav__unavailable">
                {next.number} {next.title} · {TEXT.chapter.notAvailable}
              </span>
            ))}
        </nav>
      )}
    </Page>
  );
}
