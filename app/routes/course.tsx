import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { CoursePage } from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";
import { readViewer } from "../../src/modules/viewer";
import { LernwegControl, Unterricht } from "../../src/modules/steuerung";
export { action } from "./control";
import TEXT from "../app.de.json";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { courseId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  if (!course) {
    throw new Response(null, { status: 404 });
  }
  return { course, viewer: readViewer(request) };
}

export default function Course() {
  const { course, viewer } = useLoaderData<typeof loader>();
  return (
    <CoursePage
      course={course}
      homeLabel={TEXT.navigation.courses}
      homePath="/courses"
      teacher={viewer === "teacher"}
      teachingControls={<Unterricht course={course} />}
      topicControls={<LernwegControl course={course} />}
    />
  );
}
