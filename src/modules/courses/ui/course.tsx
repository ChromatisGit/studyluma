import type { Course } from "../application/queries";
import type { Chapter } from "../../content";
import { Link, useLoaderData } from "react-router";

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
      {chapters.map((chapter) => (
        <div className="card" key={chapter.id}>
          <p>{chapter.topic_title}</p>
          <Link
            to={`/courses/${encodeURIComponent(course.id)}/topics/${encodeURIComponent(chapter.topic_id)}/chapters/${encodeURIComponent(chapter.id)}`}
          >
            {chapter.title}
          </Link>
        </div>
      ))}
    </main>
  );
}
