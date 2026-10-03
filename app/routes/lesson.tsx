import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { chapterPath, findChapter, getCourse } from "../../src/modules/courses";
import {
  getLesson,
  schoolPeriods,
  TeacherView,
} from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/viewer";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const course = getCourse(courseId);
  const lesson = getLesson(chapterId);
  // Lesson frames are the teacher's workspace; students don't get them.
  if (
    !course ||
    !findChapter(course, chapterId) ||
    !lesson ||
    readViewer(request) !== "teacher"
  ) {
    throw new Response(null, { status: 404 });
  }
  return { lesson, periods: schoolPeriods() };
}

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.lesson.title }] : [];
}

export default function LessonRoute() {
  const { lesson, periods } = useLoaderData<typeof loader>();
  const { courseId = "", chapterId = "" } = useParams();
  const chapter = chapterPath(courseId, chapterId);
  return (
    <TeacherView
      lesson={lesson}
      periods={periods}
      projectorPath={`${chapter}/lesson/projector`}
      chapterPath={chapter}
    />
  );
}
