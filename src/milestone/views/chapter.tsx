import { Link, useLoaderData } from "react-router";
import { MarkdownRenderer } from "../../ui/components/MarkdownRenderer/MarkdownRenderer";
import type { loader } from "../routes/chapter";

export default function ChapterPage() {
  const { course, chapter, worksheets } = useLoaderData<typeof loader>();
  return <main><p><Link to={`/courses/${encodeURIComponent(course.id)}`}>← {course.title}</Link></p><p>{chapter.topic_title}</p><h1>{chapter.title}</h1><div className="card"><MarkdownRenderer markdown={chapter.body} /></div><h2>Arbeitsblätter</h2>{worksheets.map(worksheet => <div className="card" key={worksheet.id}><Link to={`/w/${worksheet.public_key}`}>{worksheet.title}</Link></div>)}</main>;
}
