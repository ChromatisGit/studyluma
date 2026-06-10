import { useState } from "react";
import { Outlet, useLoaderData } from "react-router";
import { Layout, Sidebar } from "@chromatis/base";
import { adminNavItem, mainNavItems, profileNavItem } from "@core/nav";
import { RouteProvider } from "@ui/contexts/RouteContext";
import { getSession } from "@core/index.server";

const BRAND = { name: "StudyNode", initial: "S" } as const;

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  return { user: session?.user ?? null };
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const footerNavItems = [
    profileNavItem,
    ...(user?.role === "admin" ? [adminNavItem] : []),
  ];

  const sidebar = (
    <Sidebar
      brand={BRAND}
      mainNavItems={mainNavItems}
      footerNavItems={footerNavItems}
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      collapsible
    />
  );

  return (
    <RouteProvider>
      <Layout
        brand={BRAND}
        mainNavItems={mainNavItems}
        menuNavItems={footerNavItems}
        sidebar={sidebar}
      >
        <Outlet />
      </Layout>
    </RouteProvider>
  );
}
