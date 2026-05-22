import { useState } from "react";
import { Outlet, useLoaderData } from "react-router";
import { Layout, Sidebar } from "@platform/framework";
import { adminNavItems, mainNavItems } from "@core/nav";
import { RouteProvider } from "@ui/contexts/RouteContext";
import { ThemeProvider } from "@ui/contexts/ThemeContext";
import { getSession } from "@platform/index.server";

const BRAND = { name: "StudyNode", initial: "S" } as const;

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  return { user: session?.user ?? null };
}

export default function AppLayout() {
  const { user } = useLoaderData<typeof loader>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const secondaryNavItems = user?.role === "admin" ? adminNavItems : [];

  const sidebar = (
    <Sidebar
      brand={BRAND}
      mainNavItems={mainNavItems}
      secondaryNavItems={secondaryNavItems}
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      collapsible
    />
  );

  return (
    <ThemeProvider>
      <RouteProvider>
        <Layout
          brand={BRAND}
          mainNavItems={mainNavItems}
          menuNavItems={secondaryNavItems}
          sidebar={sidebar}
        >
          <Outlet />
        </Layout>
      </RouteProvider>
    </ThemeProvider>
  );
}
