import { useLoaderData } from "react-router";
import { CourseList, listCourses } from "../../src/modules/courses";

export function loader() {
  return { courses: listCourses() };
}

export default function Home() {
  const { courses } = useLoaderData<typeof loader>();
  return <CourseList courses={courses} />;
}
