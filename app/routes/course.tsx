import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { CoursePage, getCourse } from "../../src/modules/courses";
import TEXT from "../app.de.json";

export function loader({ params }: LoaderFunctionArgs) {
  const { courseId = "" } = params;
  const course = getCourse(courseId);
  if (!course) {
    throw new Response(null, { status: 404 });
  }
  return { course };
}

export default function Course() {
  const { course } = useLoaderData<typeof loader>();
  return (
    <CoursePage
      course={course}
      homeLabel={TEXT.navigation.courses}
      homePath="/courses"
    />
  );
}
