import type { ReactNode } from "react";

// Force dynamic rendering - layouts with session/auth must not be cached
export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Layout } from "@ui/layout/Layout";
import { CourseProviders } from "./CourseProviders";
import { NewUserWelcomeModal } from "@features/access/NewUserWelcomeModal";
import { getSession, isAdmin, canUserAccessPage } from "@services/authService";
import { getCourseId, getSidebarDTO, coursePublic } from "@services/courseService";
import { getActiveQuizForUser } from "@services/quizService";
import { signOutAction } from "@actions/accessActions";
import { getNewUserCodeCookie } from "@server-lib/auth";

type CourseLayoutProps = {
  children: ReactNode;
  params: Promise<{
    group: string;
    course: string;
  }>;
};

export default async function CourseLayout({ children, params }: CourseLayoutProps) {
  const session = await getSession();
  const user = session?.user ?? null;

  const { group: groupKey, course: subjectKey } = await params;

  // Read the full path from the header injected by middleware so we can
  // send users back to their exact page after login.
  const pathname = (await headers()).get("x-pathname") ?? `/${groupKey}/${subjectKey}`;
  const from = encodeURIComponent(pathname);

  const courseId = await getCourseId(groupKey, subjectKey);

  const [sidebarData, isPublic, newUserCode] = await Promise.all([
    getSidebarDTO({ courseId, user }),
    coursePublic(courseId),
    getNewUserCodeCookie(),
  ]);

  const activeQuizExists = newUserCode && user ? !!(await getActiveQuizForUser(user)) : false;

  if (!session) {
    // Allow unauthenticated access only for public courses
    if (!isPublic) {
      redirect(`/access?from=${from}`);
    }
  } else if (!isPublic && !canUserAccessPage(user, groupKey, isPublic, courseId)) {
    // Logged in but wrong group / not enrolled
    redirect(`/access?from=${from}`);
  }

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={user ? isAdmin(user) : false}
      signOutAction={signOutAction}
      suppressQuizBanner={!!newUserCode}
    >
      {newUserCode && <NewUserWelcomeModal accessCode={newUserCode} activeQuizExists={!!activeQuizExists} />}
      <CourseProviders>{children}</CourseProviders>
    </Layout>
  );
}
