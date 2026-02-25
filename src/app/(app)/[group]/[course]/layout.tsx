import type { ReactNode } from "react";

// Force dynamic rendering - layouts with session/auth must not be cached
export const dynamic = "force-dynamic";

import { Layout } from "@ui/layout/Layout";
import { CourseProviders } from "./CourseProviders";
import { getSession } from "@services/authService";
import { getCourseId } from "@services/courseService";
import { getCourseDTO, getSidebarDTO } from "@services/courseService";
import { isAdmin } from "@services/authService";
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
  const isUserAdmin = user ? isAdmin(user) : false;

  const { group: groupKey, course: subjectKey } = await params;

  const courseId = await getCourseId(groupKey, subjectKey);

  const [courseDTO, sidebarData] = await Promise.all([
    getCourseDTO(courseId),
    getSidebarDTO({ courseId, user }),
  ]);

  const activeCourseLabel = courseDTO.label;

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={isUserAdmin}
      activeCourseLabel={activeCourseLabel}
      signOutAction={signOutAction}
    >
      <CourseProviders>{children}</CourseProviders>
    </Layout>
  );
}

