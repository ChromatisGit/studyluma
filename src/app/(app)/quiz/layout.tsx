import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Layout } from "@ui/layout/Layout";
import { getSession, isAdmin } from "@services/authService";
import { getSidebarDTO } from "@services/courseService";
import { signOutAction } from "@actions/accessActions";

export const dynamic = "force-dynamic";

export default async function QuizLayout({ children }: { children: ReactNode }) {
  const session = await getSession();
  if (!session) {
    const pathname = (await headers()).get("x-pathname") ?? "/quiz";
    redirect(`/access?from=${encodeURIComponent(pathname)}`);
  }

  const sidebarData = await getSidebarDTO({ courseId: null, user: session.user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={isAdmin(session.user)}
      signOutAction={signOutAction}
    >
      {children}
    </Layout>
  );
}
