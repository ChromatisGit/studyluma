import { Outlet, useLoaderData, useParams } from "react-router";
import { listCourses, coursePath } from "../../src/modules/courses";
import { readViewer, ViewerSwitch } from "../../src/modules/viewer";
import { StudyShell, courseIcon } from "../StudyShell";
import TEXT from "../app.de.json";
import type { Route } from "./+types/shell";

export function loader({ request }: Route.LoaderArgs) {
  return {
    viewer: readViewer(request),
    courses: listCourses().map(({ id, title }) => ({ id, title })),
  };
}

/** Pages inside the StudyLuma shell; the lesson views have none. */
export default function ShellLayout() {
  const { viewer, courses } = useLoaderData<typeof loader>();
  const { courseId } = useParams();
  const navigation = [
    {
      id: "courses",
      label: TEXT.navigation.courses,
      to: "/",
      icon: courseIcon,
      children: courses.map((course) => ({
        id: course.id,
        label: course.title,
        to: coursePath(course.id),
      })),
    },
  ];
  const switchControl = (compact: boolean) => (
    <ViewerSwitch role={viewer} action="/viewer" compact={compact} />
  );
  return (
    <StudyShell
      navigation={navigation}
      currentParentTo={courseId ? coursePath(courseId) : undefined}
      sidebarFooter={{
        compact: switchControl(true),
        full: switchControl(false),
      }}
      quickActions={switchControl(true)}
    >
      <Outlet />
    </StudyShell>
  );
}
