import { getCourse, getCourseChapter, listChapterWorksheets } from "../domain";
import { notFound, requireSignedIn } from "../server";

export async function loader({ request, params }: { request: Request; params: { courseId?: string; topicId?: string; chapterId?: string } }) {
  const user = await requireSignedIn(request);
  const courseId = params.courseId ?? notFound();
  const topicId = params.topicId ?? notFound();
  const chapterId = params.chapterId ?? notFound();
  const course = await getCourse(user, courseId);
  const chapter = await getCourseChapter(user, courseId, topicId, chapterId);
  return { course, chapter, worksheets: await listChapterWorksheets(chapterId) };
}

export { default } from "../views/chapter";
