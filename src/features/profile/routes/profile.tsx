import { useLoaderData } from "react-router";
import { getSession } from "@platform/index.server";
import { assertLoggedIn } from "@platform/auth/guards";
import { getSidebarDTO } from "@services/courseService";
import { ProfilePage } from "@features/profile/ProfilePage";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  assertLoggedIn(session);
  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });
  return { sidebarData };
}

export default function Profile() {
  const { sidebarData } = useLoaderData<typeof loader>();
  return (
    <ProfilePage
      accessCode={sidebarData.accessCode}
      badge={sidebarData.badge}
      xp={sidebarData.xp}
      coursesCount={sidebarData.courses.length}
    />
  );
}
