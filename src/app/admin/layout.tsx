import type { ReactNode } from "react";
import { getSession } from "@/server/auth/auth";
import { isAdmin } from "@/domain/userTypes";
import { notFound } from "next/navigation";
import { Layout } from "@components/Layout/Layout";
import { getSidebarDTO } from "@/server/data/getSidebarDTO";
import { signOutAction } from "@/server/auth/accessAction";

type AdminLayoutProps = {
  children: ReactNode;
};

async function logoutAction() {
  "use server";
  await signOutAction();
}

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
