import { Layout } from "@ui/layout/Layout";
import { getSession } from "@services/authService";
import { getSidebarDTO } from "@services/getSidebarDTO";
import { isAdmin } from "@schema/userTypes";
import { logoutAction } from "@actions/logoutAction";

type PageParams = {
  params: Promise<{
    group: string;
  }>;
};

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
