import { Layout } from "@ui/layout/Layout";
import { PageHeader } from "@components/PageHeader/PageHeader";
import { getSession } from "@services/authService";
import { getSidebarDTO } from "@services/getSidebarDTO";
import { isAdmin } from "@schema/userTypes";
import { signOutAction } from "@actions/accessActions";

type PageParams = {
  params: Promise<{
    group: string;
  }>;
};

export default async function GroupOverviewPage({ params }: PageParams) {
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
      signOutAction={signOutAction}
    >
      <main>
        <PageHeader title="Group overview" />
        <p>Group: {group}</p>
        <p>This route is stubbed until the group overview UI is integrated.</p>
      </main>
    </Layout>
  );
}
