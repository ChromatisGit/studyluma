import { Layout } from "@components/Layout/Layout";
import { getSession } from "@/server/auth/auth";
import { getSidebarDTO } from "@/server/data/getSidebarDTO";
import { isAdmin } from "@/domain/userTypes";
import { signOutAction } from "@/server/auth/accessAction";

type PageParams = {
  params: Promise<{
    group: string;
  }>;
};

async function logoutAction() {
  "use server";
  await signOutAction();
}

export default async function GroupPrinciplesPage({ params }: PageParams) {
  const { group } = await params;

  const session = await getSession();
  const user = session?.user ?? null;
  const isUserAdmin = user ? isAdmin(user) : false;
  const sidebarData = await getSidebarDTO({ courseId: null, user });

  return (
    <Layout
      sidebarData={sidebarData}
      isAdmin={isUserAdmin}
      activeCourseLabel={null}
      logoutAction={logoutAction}
    >
      <main>
        <h1>Group principles</h1>
        <p>Group: {group}</p>
        <p>This route is stubbed until the group principles UI is integrated.</p>
      </main>
    </Layout>
  );
}
