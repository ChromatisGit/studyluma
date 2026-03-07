import type { ReactNode } from "react";

// Force dynamic rendering - layouts with session/auth must not be cached
export const dynamic = "force-dynamic";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Layout } from "@ui/layout/Layout";
import { CourseProviders } from "./CourseProviders";
import { getSession, isAdmin, canUserAccessPage } from "@services/authService";
import { getCourseId, getSidebarDTO, coursePublic } from "@services/courseService";
import { signOutAction } from "@actions/accessActions";

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

  const [sidebarData, isPublic] = await Promise.all([
    getSidebarDTO({ courseId, user }),
    coursePublic(courseId),
  ]);

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
    >
      <CourseProviders>{children}</CourseProviders>
    </Layout>
  );
}
