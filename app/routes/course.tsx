import { useLoaderData } from "react-router";
import { CoursePage, getCourse } from "../../src/modules/courses";
import TEXT from "../app.de.json";
import type { Route } from "./+types/course";

export function loader({ params }: Route.LoaderArgs) {
  const course = getCourse(params.courseId);
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
      homePath="/"
    />
  );
}
