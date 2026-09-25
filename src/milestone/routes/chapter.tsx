import { getCourse, getCourseChapter, listChapterWorksheets } from "../domain";
import { notFound, requireSignedIn, type WebsiteLoadContext } from "../server";

export async function loader({ request, params, context }: { request: Request; params: { courseId?: string; topicId?: string; chapterId?: string }; context: WebsiteLoadContext }) {
  const user = await requireSignedIn(request, context);
  const courseId = params.courseId ?? notFound();
  const topicId = params.topicId ?? notFound();
  const chapterId = params.chapterId ?? notFound();
  const course = await getCourse(user, courseId, context);
  const chapter = await getCourseChapter(user, courseId, topicId, chapterId, context);
  return { course, chapter, worksheets: await listChapterWorksheets(chapterId, context) };
}

export { default } from "../views/chapter";
