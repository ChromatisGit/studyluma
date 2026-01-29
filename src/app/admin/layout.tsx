import type { ReactNode } from "react";
import { getSession } from "@services/authService";
import { isAdmin } from "@schema/userTypes";
import { notFound } from "next/navigation";
import { Layout } from "@ui/layout/Layout";
import { getSidebarDTO } from "@services/getSidebarDTO";
import { logoutAction } from "@actions/logoutAction";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getSession();

  if (!session || !isAdmin(session.user)) {
    notFound();
  }

  // Get sidebar data (empty since we're not in a course context)
  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={true}
      activeCourseLabel={null}
      logoutAction={logoutAction}
    >
      {children}
    </Layout>
  );
}
