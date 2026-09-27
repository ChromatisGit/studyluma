import type { Course } from "../application/queries";
import type { Chapter } from "../../content";
import { Link, useLoaderData } from "react-router";
import { chapterPath, groupChapters } from "../application/navigation";

export default function CoursePage() {
  const { course, chapters, isTeacher } = useLoaderData<{
    course: Course;
    chapters: Chapter[];
    isTeacher: boolean;
  }>();
  return (
    <main>
      <p>
        <Link to="/">← Meine Kurse</Link>
      </p>
      <h1>{course.title}</h1>
      {isTeacher && (
        <p>
          <Link to={`/courses/${encodeURIComponent(course.id)}/teacher`}>
            Lehrkraft-Dashboard
          </Link>
        </p>
      )}
      {groupChapters(chapters).map((topic) => (
        <section
          className="card"
          key={topic.id}
          aria-labelledby={`topic-${topic.id}`}
        >
          <h2 id={`topic-${topic.id}`}>{topic.title}</h2>
          <ul>
            {topic.chapters.map((chapter) => (
              <li key={chapter.id}>
                <Link to={chapterPath(course.id, chapter)}>
                  {chapter.title}
                </Link>
                {course.current_chapter_id === chapter.id &&
                  " – Aktuelles Kapitel"}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
