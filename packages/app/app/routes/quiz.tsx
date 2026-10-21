import { useLoaderData, useParams } from "react-router";
import { chapterPathById, coursePath } from "../../src/modules/courses";
import { QuizPage, quizText } from "../../src/modules/classroom";
import type { loader } from "./quiz.server";

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
