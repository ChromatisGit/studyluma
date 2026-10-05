import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { chapterPath, findChapter } from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";
import {
  getLesson,
  schoolPeriods,
  TeacherView,
} from "../../src/modules/lessons";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  const lesson = getLesson(chapterId);
  if (!course || !findChapter(course, chapterId) || !lesson) {
    throw new Response(null, { status: 404 });
  }
  return {
    lesson,
    periods: schoolPeriods(),
    initialFrameId: new URL(request.url).searchParams.get("start") ?? undefined,
  };
}

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.lesson.title }] : [];
}

export default function LessonRoute() {
  const { lesson, periods, initialFrameId } = useLoaderData<typeof loader>();
  const { courseId = "", chapterId = "" } = useParams();
  const chapter = chapterPath(courseId, chapterId);
  return (
    <TeacherView
      courseId={courseId}
      lesson={lesson}
      periods={periods}
      projectorPath={`${chapter}/lesson/projector`}
      chapterPath={chapter}
      initialFrameId={initialFrameId}
    />
  );
}
