import { getSession } from "@services/authService";
import { getSidebarDTO } from "@services/courseService";
import { signOutAction } from "@actions/accessActions";
import { ProfilePage } from "@features/profile/ProfilePage";

export const dynamic = "force-dynamic";

export default async function ProfileRoute() {
  const session = await getSession();
  const user = session?.user ?? null;
  const sidebarData = await getSidebarDTO({ courseId: null, user });

  return (
    <ProfilePage
      accessCode={sidebarData.accessCode}
      badge={sidebarData.badge}
      xp={sidebarData.xp}
      coursesCount={sidebarData.courses.length}
      signOutAction={signOutAction}
    />
  );
}
