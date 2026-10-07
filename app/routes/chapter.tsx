import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { ChapterPage, findChapter } from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  if (!course || !findChapter(course, chapterId)) {
    throw new Response(null, { status: 404 });
  }
  return {
    course,
    chapterId,
  };
}

export default function Chapter() {
  const { course, chapterId } = useLoaderData<typeof loader>();
  return <ChapterPage course={course} chapterId={chapterId} />;
}
