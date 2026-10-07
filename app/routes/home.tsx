import { useLoaderData, type LoaderFunctionArgs } from "react-router";
import { CourseList, listCourses } from "../../src/modules/courses";
import { readViewer } from "../../src/modules/viewer";

export function loader({ request }: LoaderFunctionArgs) {
  return { courses: listCourses(), viewer: readViewer(request) };
}

export default function Home() {
  const { courses, viewer } = useLoaderData<typeof loader>();
  return <CourseList courses={courses} teacher={viewer === "teacher"} />;
}
