import { getCourse, listCourseChapters } from "../domain";
import { notFound, requireSignedIn } from "../server";

export async function loader({ request, params }: { request: Request; params: { courseId?: string } }) {
  const user = await requireSignedIn(request);
  const courseId = params.courseId ?? notFound();
  const course = await getCourse(user, courseId);
  const chapters = await listCourseChapters(user, courseId);
  return { course, chapters };
}

export { default } from "../views/course";
