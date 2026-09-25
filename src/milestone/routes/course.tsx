import { getCourse, listCourseChapters } from "../domain";
import { notFound, requireSignedIn, type WebsiteLoadContext } from "../server";

export async function loader({ request, params, context }: { request: Request; params: { courseId?: string }; context: WebsiteLoadContext }) {
  const user = await requireSignedIn(request, context);
  const courseId = params.courseId ?? notFound();
  const course = await getCourse(user, courseId, context);
  const chapters = await listCourseChapters(user, courseId, context);
  return { course, chapters };
}

export { default } from "../views/course";
