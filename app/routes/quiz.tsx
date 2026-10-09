import type { LoaderFunctionArgs } from "react-router";
import { useParams } from "react-router";
import { chapterPath, coursePath } from "../../src/modules/courses";
import { loadCourses } from "../site.server";
import { QuizPage, quizText } from "../../src/modules/classroom";

export function loader({ params, request }: LoaderFunctionArgs) {
  if (!loadCourses(request).some((course) => course.id === params.courseId)) {
    throw new Response(null, { status: 404 });
  }
  return null;
}

export function meta() {
  return [{ title: quizText.page.title }];
}

/** Where students land while their teacher runs a quiz. */
export default function QuizRoute() {
  const { courseId = "" } = useParams();
  return (
    <QuizPage
      courseId={courseId}
      coursePath={coursePath(courseId)}
      chapterPath={(chapterId) => chapterPath(courseId, chapterId)}
    />
  );
}
