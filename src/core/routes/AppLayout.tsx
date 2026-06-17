import { useState } from "react";
import { Outlet, useLoaderData } from "react-router";
import { Layout, Sidebar } from "@chromatis/base";
import { adminNavItem, mainNavItems, profileNavItem } from "@core/nav";
import { RouteProvider } from "@ui/contexts/RouteContext";
import { getSession } from "@core/index.server";
import { getSidebarDTO } from "@services/courseService";
import { useSidebarNav } from "@ui/layout/CourseNav/useSidebarNav";
import type { SidebarDTO } from "@schema/courseTypes";

const BRAND = { name: "StudyLuma", initial: "S" } as const;

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  const user = session?.user ?? null;
  const sidebarData = await getSidebarDTO({ courseId: null, user });
  return { user, sidebarData };
}

type AppLayoutInnerProps = {
  sidebarData: SidebarDTO;
  footerNavItems: typeof mainNavItems;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (v: boolean) => void;
};

function AppLayoutInner({
  sidebarData,
  footerNavItems,
  sidebarCollapsed,
  setSidebarCollapsed,
}: AppLayoutInnerProps) {
  const { navSlot, mainNavItems: sidebarMainNavItems } = useSidebarNav(sidebarData, mainNavItems);

  const sidebar = (
    <Sidebar
      brand={BRAND}
      mainNavItems={sidebarMainNavItems}
      footerNavItems={footerNavItems}
      navSlot={navSlot}
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      collapsible
    />
  );

  return (
    <Layout
      brand={BRAND}
      mainNavItems={mainNavItems}
      menuNavItems={footerNavItems}
      sidebar={sidebar}
    >
      <Outlet />
    </Layout>
  );
}

export default function AppLayout() {
  const { user, sidebarData } = useLoaderData<typeof loader>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const footerNavItems = [
    profileNavItem,
    ...(user?.role === "admin" ? [adminNavItem] : []),
  ];

  return (
    <RouteProvider>
      <AppLayoutInner
        sidebarData={sidebarData}
        footerNavItems={footerNavItems}
        sidebarCollapsed={sidebarCollapsed}
        setSidebarCollapsed={setSidebarCollapsed}
      />
    </RouteProvider>
  );
}
