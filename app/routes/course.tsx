import type { LoaderFunctionArgs } from "react-router";
import { redirect, useLoaderData, useLocation } from "react-router";
import {
  CoursePage,
  courseContentPath,
  coursePath,
  courseStructurePath,
} from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";
import { readViewer } from "../../src/modules/viewer";
import {
  Inhalte,
  LernwegControl,
  Unterricht,
} from "../../src/modules/steuerung";
export { action } from "./control";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { courseId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  if (!course) {
    throw new Response(null, { status: 404 });
  }
  const path = new URL(request.url).pathname.replace(/\/+$/, "");
  const viewer = readViewer(request);
  const isStudentOverview = path === coursePath(courseId);
  if (viewer === "student" && !isStudentOverview) {
    throw redirect(coursePath(courseId));
  }
  return { course, viewer };
}

export default function Course() {
  const { course, viewer } = useLoaderData<typeof loader>();
  const location = useLocation();
  const path = location.pathname.replace(/\/+$/, "");
  const activeTab =
    path === coursePath(course.id)
      ? "student"
      : path === courseStructurePath(course.id)
        ? "course-structure"
        : path === courseContentPath(course.id)
          ? "content"
          : "overview";
  return (
    <CoursePage
      course={course}
      teacher={viewer === "teacher"}
      teachingControls={<Unterricht course={course} />}
      structureControls={<LernwegControl course={course} />}
      contents={<Inhalte course={course} />}
      activeTab={activeTab}
    />
  );
}
