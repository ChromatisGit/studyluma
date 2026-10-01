import { canManageCourses, getCourse } from "../../modules/courses";
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
  url,
}: {
  request: Request;
  params: { courseId?: string };
  context: WebsiteLoadContext;
  url: URL;
}) {
  const user = await requireSignedIn(request, context, url);
  const courseId = params.courseId ?? notFound();
  const course =
    (await getCourse(user, courseId, getDatabase(context))) ?? notFound();
  const chapters = await listCourseChapters(
    user,
    courseId,
    getDatabase(context),
  );
  return {
    course,
    chapters,
    isTeacher: await canManageCourses(user, getDatabase(context)),
  };
}

export { CourseView as default } from "../../modules/courses";
