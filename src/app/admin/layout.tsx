import type { ReactNode } from "react";
import { getSession, assertAdminAccess } from "@services/authService";
import { Layout } from "@ui/layout/Layout";
import { getSidebarDTO } from "@services/courseService";
import { signOutAction } from "@actions/accessActions";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();
  assertAdminAccess(session);

  // Get sidebar data (empty since we're not in a course context)
  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={true}
      activeCourseLabel={null}
      signOutAction={signOutAction}
    >
      {children}
    </Layout>
  );
}
