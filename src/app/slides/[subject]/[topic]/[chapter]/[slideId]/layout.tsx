import type { ReactNode } from "react";
import { getSession, assertAdminAccess } from "@services/authService";
import { Layout } from "@ui/layout/Layout";
import { TsWorkerProvider } from "@features/contentpage";
import { getSidebarDTO } from "@services/courseService";
import { signOutAction } from "@actions/accessActions";

export const dynamic = "force-dynamic";

export default async function SlideLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  assertAdminAccess(session);

  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={true}
      activeCourseLabel={null}
      signOutAction={signOutAction}
      fullWidth
    >
      <TsWorkerProvider>{children}</TsWorkerProvider>
    </Layout>
  );
}
