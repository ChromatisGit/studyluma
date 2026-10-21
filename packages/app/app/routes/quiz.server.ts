import type { DataArgs } from "@chromatis/base/data";
import { loadCourses } from "../site.server";
import { classroomEnabled } from "../../src/modules/classroom/server/classroom.server";

export function loader({ params, request }: DataArgs) {
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
