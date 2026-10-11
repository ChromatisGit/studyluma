import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { CourseList } from "../../src/modules/courses";
import { loadCourses } from "../site.server";
import { readViewer } from "../../src/modules/classroom";

export function loader({ request }: LoaderFunctionArgs) {
  return {
    courses: loadCourses(request),
    viewer: readViewer(request),
  };
}

export default function Home() {
  const { courses, viewer } = useLoaderData<typeof loader>();
  return <CourseList courses={courses} teacher={viewer === "teacher"} />;
}
