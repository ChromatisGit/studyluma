import { redirect } from "next/navigation";
import { getSession } from "@services/authService";
import { getPublicNavbarCourses } from "@services/courseService";
import { PublicHomePage } from "@features/homepage/PublicHomePage";

export default async function RootPage() {
  const session = await getSession();

  if (session) {
    redirect("/");
  }

  const publicCourses = await getPublicNavbarCourses();

  return <PublicHomePage publicCourses={publicCourses} />;
}
