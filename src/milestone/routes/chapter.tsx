import { Link, useLoaderData } from "react-router";
import { getCourse, getCourseChapter, listChapterWorksheets } from "../domain";
import { notFound, requireSignedIn } from "../server";
import { MarkdownRenderer } from "../../ui/components/MarkdownRenderer/MarkdownRenderer";

export async function loader({ request, params }: { request: Request; params: { courseId?: string; topicId?: string; chapterId?: string } }) {
  const user = await requireSignedIn(request);
  const courseId = params.courseId ?? notFound();
  const topicId = params.topicId ?? notFound();
  const chapterId = params.chapterId ?? notFound();
  const course = await getCourse(user, courseId);
  const chapter = await getCourseChapter(user, courseId, topicId, chapterId);
  return { course, chapter, worksheets: await listChapterWorksheets(chapterId) };
}

export default function ChapterPage() {
  const { course, chapter, worksheets } = useLoaderData<typeof loader>();
  return <main><p><Link to={`/courses/${encodeURIComponent(course.id)}`}>← {course.title}</Link></p><p>{chapter.topic_title}</p><h1>{chapter.title}</h1><div className="card"><MarkdownRenderer markdown={chapter.body} /></div><h2>Arbeitsblätter</h2>{worksheets.map(worksheet => <div className="card" key={worksheet.id}><Link to={`/w/${worksheet.public_key}`}>{worksheet.title}</Link></div>)}</main>;
}
