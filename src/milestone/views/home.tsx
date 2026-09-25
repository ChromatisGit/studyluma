import { Form, Link, useLoaderData } from "react-router";
import type { loader } from "../routes/home";

export default function Home() {
  const { courses } = useLoaderData<typeof loader>();
  return <main><h1>Meine Kurse</h1>{courses.length ? courses.map(course => <div className="card" key={course.id}><Link to={`/courses/${encodeURIComponent(course.id)}`}>{course.title}</Link></div>) : <p>Du bist noch in keinem Kurs eingeschrieben.</p>}<Form method="post" action="/logout"><button type="submit">Abmelden</button></Form></main>;
}
