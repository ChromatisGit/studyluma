import type { Course } from "../application/queries";
import type { Chapter } from "../../content";
import { Link, useLoaderData } from "react-router";
import { MarkdownRenderer } from "../../content";
import type { Worksheet } from "../../worksheets";
import { chapterPath, groupChapters } from "../application/navigation";

export default function ChapterPage() {
  const { course, chapter, chapters, worksheets } = useLoaderData<{
    course: Course;
    chapter: Chapter;
    chapters: Chapter[];
    worksheets: Worksheet[];
  }>();
  const index = chapters.findIndex((item) => item.id === chapter.id);
  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  return (
    <main>
      <p>
        <Link to={`/courses/${encodeURIComponent(course.id)}`}>
          ← {course.title}
        </Link>
      </p>
      <p>{chapter.topic_title}</p>
      <h1>{chapter.title}</h1>
      {course.current_chapter_id === chapter.id && (
        <p>Aktuelles Kapitel</p>
      )}
      <nav aria-label="Kursnavigation" className="card">
        {groupChapters(chapters).map((topic) => (
          <div key={topic.id}>
            <h2>{topic.title}</h2>
            <ul>
              {topic.chapters.map((item) => (
                <li key={item.id}>
                  <Link
                    to={chapterPath(course.id, item)}
                    aria-current={item.id === chapter.id ? "page" : undefined}
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
      <div className="card">
        <MarkdownRenderer markdown={chapter.body} />
      </div>
      <h2>Arbeitsblätter</h2>
      {worksheets.map((worksheet) => (
        <div className="card" key={worksheet.id}>
          {worksheet.is_locked ? (
            <span>{worksheet.title} – Gesperrt</span>
          ) : (
            <Link to={`/w/${worksheet.public_key}`}>{worksheet.title}</Link>
          )}
        </div>
      ))}
      <nav aria-label="Kapitel wechseln">
        {previous && (
          <Link to={chapterPath(course.id, previous)}>
            ← Vorheriges Kapitel
          </Link>
        )}
        {next && (
          <Link to={chapterPath(course.id, next)}>
            Nächstes Kapitel →
          </Link>
        )}
      </nav>
    </main>
  );
}
