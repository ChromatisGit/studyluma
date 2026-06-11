import { redirect, useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { isAdmin } from "@core/auth/guards";
import { getPublicNavbarCourses, getSidebarDTO } from "@services/courseService";
import { PublicHomePage } from "@features/homepage/PublicHomePage";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  const user = session?.user ?? null;
  const [sidebarData, publicCourses] = await Promise.all([
    getSidebarDTO({ courseId: null, user }),
    getPublicNavbarCourses(),
  ]);

  const url = new URL(request.url);
  const firstCourse = sidebarData.courses[0];
  if (user && !url.searchParams.get("home") && firstCourse && !isAdmin(user)) {
    throw redirect(firstCourse.href);
  }

  return { publicCourses };
}

export default function Home() {
  const { publicCourses } = useLoaderData<typeof loader>();
  return <PublicHomePage publicCourses={publicCourses} />;
}
