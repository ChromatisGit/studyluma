import { Link, useLoaderData } from "react-router";
import { getCourse, listCourseChapters } from "../domain";
import { notFound, requireSignedIn } from "../server";

export async function loader({ request, params }: { request: Request; params: { courseId?: string } }) {
  const user = await requireSignedIn(request);
  const courseId = params.courseId ?? notFound();
  const course = await getCourse(user, courseId);
  const chapters = await listCourseChapters(user, courseId);
  return { course, chapters };
}

export default function CoursePage() {
  const { course, chapters } = useLoaderData<typeof loader>();
  return <main><p><Link to="/">← Meine Kurse</Link></p><h1>{course.title}</h1>{chapters.map(chapter => <div className="card" key={chapter.id}><p>{chapter.topic_title}</p><Link to={`/courses/${encodeURIComponent(course.id)}/topics/${encodeURIComponent(chapter.topic_id)}/chapters/${encodeURIComponent(chapter.id)}`}>{chapter.title}</Link></div>)}</main>;
}
