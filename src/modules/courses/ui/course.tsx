import type { Course } from "../application/queries";
import type { Chapter } from "../../content";
import { Link, useLoaderData } from "react-router";
import { chapterPath, groupChapters } from "../application/navigation";

export default function CoursePage() {
  const { course, chapters } = useLoaderData<{
    course: Course;
    chapters: Chapter[];
  }>();
  return (
    <main>
      <p>
        <Link to="/">← Meine Kurse</Link>
      </p>
      <h1>{course.title}</h1>
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
                <Link to={chapterPath(course.id, chapter)}>{chapter.title}</Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
