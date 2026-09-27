import { Link, useLoaderData } from "react-router";
import type { Chapter } from "../../content";
import type { Course, TeacherWorksheet } from "../application/queries";
import { TeacherControls } from "./TeacherControls";

export default function TeacherPage() {
  const { course, chapters, worksheets } = useLoaderData<{
    course: Course;
    chapters: Chapter[];
    worksheets: TeacherWorksheet[];
  }>();
  return (
    <main>
      <p>
        <Link to={`/courses/${encodeURIComponent(course.id)}`}>
          ← {course.title}
        </Link>
      </p>
      <h1>Lehrkraft-Dashboard: {course.title}</h1>
      <TeacherControls
        course={course}
        chapters={chapters}
        worksheets={worksheets}
        action={`/courses/${encodeURIComponent(course.id)}/teacher`}
      />
    </main>
  );
}
