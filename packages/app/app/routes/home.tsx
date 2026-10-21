import { useLoaderData } from "react-router";
import type { loader } from "./home.server";
import { CourseList } from "../../src/modules/courses";

export default function Home() {
  const { courses, viewer } = useLoaderData<typeof loader>();
  return <CourseList courses={courses} teacher={viewer === "teacher"} />;
}
