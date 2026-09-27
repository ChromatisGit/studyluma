import { getCourse } from "../../modules/courses";
import { getCourseChapter, listCourseChapters } from "../../modules/content";
import { listChapterWorksheets } from "../../modules/worksheets";
import {
  getDatabase,
  notFound,
  requireSignedIn,
  type WebsiteLoadContext,
} from "../services";

export async function loader({
  request,
  params,
  context,
}: {
  request: Request;
  params: { courseId?: string; topicId?: string; chapterId?: string };
  context: WebsiteLoadContext;
}) {
  const user = await requireSignedIn(request, context);
  const courseId = params.courseId ?? notFound();
  const topicId = params.topicId ?? notFound();
  const chapterId = params.chapterId ?? notFound();
  const course =
    (await getCourse(user, courseId, getDatabase(context))) ?? notFound();
  const chapter =
    (await getCourseChapter(
      user,
      courseId,
      topicId,
      chapterId,
      getDatabase(context),
    )) ?? notFound();
  return {
    course,
    chapter,
    chapters: await listCourseChapters(user, courseId, getDatabase(context)),
    worksheets: await listChapterWorksheets(chapterId, getDatabase(context)),
  };
}

export { ChapterView as default } from "../../modules/courses";
