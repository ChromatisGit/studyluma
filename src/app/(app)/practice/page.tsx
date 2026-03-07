import { redirect } from "next/navigation";
import { getSession } from "@services/authService";
import { getSidebarDTO } from "@services/courseService";
import { PracticeHub } from "@features/practise/PracticeHub";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const session = await getSession();
  if (!session) redirect("/access?from=/practice");

  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });

  return (
    <PracticeHub
      courses={sidebarData.courses}
      xp={sidebarData.xp}
      badge={sidebarData.badge}
    />
  );
}
