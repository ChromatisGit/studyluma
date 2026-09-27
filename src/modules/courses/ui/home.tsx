import type { Course } from "../application/queries";
import { Form, Link, useLoaderData } from "react-router";

export default function Home() {
  const { courses, isTeacher } = useLoaderData<{
    courses: Course[];
    isTeacher: boolean;
  }>();
  return (
    <main>
      <h1>Meine Kurse</h1>
      {courses.length ? (
        courses.map((course) => (
          <div className="card" key={course.id}>
            <Link to={`/courses/${encodeURIComponent(course.id)}`}>
              {course.title}
            </Link>
            {isTeacher && (
              <p>
                <Link to={`/courses/${encodeURIComponent(course.id)}/teacher`}>
                  Lehrkraft-Dashboard
                </Link>
              </p>
            )}
          </div>
        ))
      ) : (
        <p>Du bist noch in keinem Kurs eingeschrieben.</p>
      )}
      <Form method="post" action="/logout">
        <button type="submit">Abmelden</button>
      </Form>
    </main>
  );
}
