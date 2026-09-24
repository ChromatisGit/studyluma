import { Form, Link, useLoaderData } from "react-router";
import { listCourses } from "../domain";
import { requireSignedIn } from "../server";

export async function loader({ request }: { request: Request }) {
  const user = await requireSignedIn(request);
  return { courses: await listCourses(user) };
}

export default function Home() {
  const { courses } = useLoaderData<typeof loader>();
  return <main><h1>Meine Kurse</h1>{courses.length ? courses.map(course => <div className="card" key={course.id}><Link to={`/courses/${encodeURIComponent(course.id)}`}>{course.title}</Link></div>) : <p>Du bist noch in keinem Kurs eingeschrieben.</p>}<Form method="post" action="/logout"><button type="submit">Abmelden</button></Form></main>;
}
