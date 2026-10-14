import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { chapterPathById, coursePath } from "../../src/modules/courses";
import { loadCourses } from "../site.server";
import { QuizPage, quizText } from "../../src/modules/classroom";
import { classroomEnabled } from "../../src/modules/classroom/server/classroom.server";

export function loader({ params, request }: LoaderFunctionArgs) {
  // Live quizzes belong to classroom sessions.
  if (!classroomEnabled()) {
    throw new Response(null, { status: 404 });
  }
  const course = loadCourses(request).find(
    (item) => item.id === params.courseId,
  );
  if (!course) {
    throw new Response(null, { status: 404 });
  }
  return { course };
}

export function meta() {
  return [{ title: quizText.page.title }];
}

/** Where students land while their teacher runs a quiz. */
export default function QuizRoute() {
  const { course } = useLoaderData<typeof loader>();
  const { courseId = "" } = useParams();
  return (
    <QuizPage
      courseId={courseId}
      coursePath={coursePath(courseId)}
      chapterPath={(chapterId) => chapterPathById(course, chapterId)}
    />
  );
}
