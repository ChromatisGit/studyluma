import type { ReactNode } from "react";

// Force dynamic rendering - layouts with session/auth must not be cached
export const dynamic = "force-dynamic";

import { Layout } from "@ui/layout/Layout";
import { CourseProviders } from "./CourseProviders";
import { getSession } from "@services/authService";
import { getCourseId } from "@services/courseService";
import { getCourseDTO } from "@services/getCourseDTO";
import { getSidebarDTO } from "@services/getSidebarDTO";
import { isAdmin } from "@schema/userTypes";
import { logoutAction } from "@actions/logoutAction";

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
  const isUserAdmin = user ? isAdmin(user) : false;

  const { group: groupKey, course: subjectKey } = await params;
  const courseId = getCourseId(groupKey, subjectKey);
  const activeCourseLabel = getCourseDTO(courseId).label;

  const sidebarData = await getSidebarDTO({ courseId, user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={isUserAdmin}
      activeCourseLabel={activeCourseLabel}
      logoutAction={logoutAction}
    >
      <CourseProviders>{children}</CourseProviders>
    </Layout>
  );
}

