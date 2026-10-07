import { useSyncExternalStore } from "react";
import { Link } from "react-router";
import { Breadcrumbs, Page, PageHeader } from "@chromatis/base/ui";
import { SummaryRenderer } from "../../content";
import { summaryStore } from "../../teaching";
import {
  chapterPath,
  coursePath,
  findChapter,
  neighbours,
} from "../application/navigation";
import { getSummary } from "../infrastructure/courseRepository";
import type { Course } from "../domain/course";
import { ChapterMaterials } from "./ChapterMaterials";
import { Pictogram } from "./Pictogram";
import TEXT from "./courses.de.json";

export interface ChapterPageProps {
  course: Course;
  chapterId: string;
}

/** Full chapter resources, including the summary when it is available. */
export function ChapterPage({ course, chapterId }: ChapterPageProps) {
  const chapter = findChapter(course, chapterId);
  const access = summaryStore(chapterId);
  const summary = useSyncExternalStore(
    access.subscribe,
    access.getSnapshot,
    access.getServerSnapshot,
  );
  if (!chapter) {
    return null;
  }
  const heading = `${chapter.number} ${chapter.title}`;
  const markdown = getSummary(chapterId);
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
          id={chapter.topic.icon}
          fallbackLabel={chapter.topic.title}
        />
        <div className="kapitel-head__text">
          <p className="kapitel-head__meta">{chapter.topic.title}</p>
          <h2 className="h2 kapitel-head__title">{heading}</h2>
        </div>
      </header>
      <ChapterMaterials
        courseId={course.id}
        chapterId={chapterId}
        availableOnly
      />
      {markdown && summary.unlocked && (
        <section
          className="content-section"
          id="zusammenfassung"
          aria-labelledby="summary-title"
        >
          <h2 className="h2" id="summary-title">
            Zusammenfassung
          </h2>
          <SummaryRenderer markdown={markdown} />
        </section>
      )}
      {(previous || next) && (
        <nav className="kapitel-nav" aria-label="Kapitel wechseln">
          {previous ? (
            <Link to={chapterPath(course.id, previous.id)}>
              <span aria-hidden="true">←</span> {previous.number}{" "}
              {previous.title}
            </Link>
          ) : (
            <span />
          )}
          {next &&
            (next.reached ? (
              <Link to={chapterPath(course.id, next.id)}>
                {next.number} {next.title} <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span className="kapitel-nav__unavailable">
                {next.number} {next.title} · Noch nicht verfügbar
              </span>
            ))}
        </nav>
      )}
    </Page>
  );
}
