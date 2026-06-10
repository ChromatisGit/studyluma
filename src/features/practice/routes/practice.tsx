import { useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertLoggedIn } from "@core/auth/guards";
import { getSidebarDTO } from "@services/courseService";
import { PracticeHub } from "@features/practice/PracticeHub";

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  assertLoggedIn(session);
  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });
  return { sidebarData };
}

export default function Practice() {
  const { sidebarData } = useLoaderData<typeof loader>();
  return (
    <PracticeHub
      courses={sidebarData.courses}
      xp={sidebarData.xp}
      badge={sidebarData.badge}
    />
  );
}
