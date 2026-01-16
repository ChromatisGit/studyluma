import type { ReactNode } from "react";

// Force dynamic rendering - layouts with session/auth must not be cached
export const dynamic = "force-dynamic";

import { Layout } from "@components/Layout/Layout";
import { CourseProviders } from "./CourseProviders";
import { getSession } from "@/server/auth/auth";
import { getCourseId } from "@/server/data/courses";
import { getCourseDTO } from "@/server/data/getCourseDTO";
import { getSidebarDTO } from "@/server/data/getSidebarDTO";
import { isAdmin } from "@/domain/userTypes";
import { signOutAction } from "@/server/auth/accessAction";

type CourseLayoutProps = {
  children: ReactNode;
  params: Promise<{
    group: string;
    course: string;
  }>;
};

async function logoutAction() {
  "use server";
  await signOutAction();
}

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
