import { redirect, useLoaderData } from "react-router";
import { getSession } from "@platform/index.server";
import { isAdmin } from "@platform/auth/guards";
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
  if (user && !url.searchParams.get("home") && sidebarData.courses.length > 0) {
    throw redirect(isAdmin(user) ? "/admin" : sidebarData.courses[0]!.href);
  }

  return { publicCourses };
}

export default function Home() {
  const { publicCourses } = useLoaderData<typeof loader>();
  return <PublicHomePage publicCourses={publicCourses} />;
}
