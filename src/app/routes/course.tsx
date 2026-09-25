import { getCourse } from "../../modules/courses";
import { listCourseChapters } from "../../modules/content";
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
  params: { courseId?: string };
  context: WebsiteLoadContext;
}) {
  const user = await requireSignedIn(request, context);
  const courseId = params.courseId ?? notFound();
  const course =
    (await getCourse(user, courseId, getDatabase(context))) ?? notFound();
  const chapters = await listCourseChapters(
    user,
    courseId,
    getDatabase(context),
  );
  return { course, chapters };
}

export { CourseView as default } from "../../modules/courses";
