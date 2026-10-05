import type { LoaderFunctionArgs } from "react-router";
import { useParams } from "react-router";
import { chapterPath, coursePath, getCourse } from "../../src/modules/courses";
import { QuizPage, quizText } from "../../src/modules/quiz";

export function loader({ params }: LoaderFunctionArgs) {
  if (!getCourse(params.courseId ?? "")) {
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
