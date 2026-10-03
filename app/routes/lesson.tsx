import { useLoaderData, useParams } from "react-router";
import { chapterPath, findChapter, getCourse } from "../../src/modules/courses";
import {
  getLesson,
  schoolPeriods,
  TeacherView,
} from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/viewer";
import type { Route } from "./+types/lesson";

export function loader({ params, request }: Route.LoaderArgs) {
  const course = getCourse(params.courseId);
  const lesson = getLesson(params.chapterId);
  // Lesson frames are the teacher's workspace; students don't get them.
  if (
    !course ||
    !findChapter(course, params.chapterId) ||
    !lesson ||
    readViewer(request) !== "teacher"
  ) {
    throw new Response(null, { status: 404 });
  }
  return { lesson, periods: schoolPeriods() };
}

export function meta({ data }: Route.MetaArgs) {
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
