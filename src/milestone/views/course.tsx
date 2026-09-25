import { Link, useLoaderData } from "react-router";
import type { loader } from "../routes/course";

export default function CoursePage() {
  const { course, chapters } = useLoaderData<typeof loader>();
  return <main><p><Link to="/">← Meine Kurse</Link></p><h1>{course.title}</h1>{chapters.map(chapter => <div className="card" key={chapter.id}><p>{chapter.topic_title}</p><Link to={`/courses/${encodeURIComponent(course.id)}/topics/${encodeURIComponent(chapter.topic_id)}/chapters/${encodeURIComponent(chapter.id)}`}>{chapter.title}</Link></div>)}</main>;
}
