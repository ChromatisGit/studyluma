import { useState } from "react";
import { Form, Outlet, redirect, useLoaderData } from "react-router";
import { Layout, Sidebar } from "@chromatis/base";
import { mainNavItems } from "@core/nav";
import { RouteProvider } from "@ui/contexts/RouteContext";
import { getSession, buildSessionCookie } from "@core/index.server";
import { getDemoUser, demoRoleFromUser, type DemoRole } from "@features/demo/demoSession.server";

const BRAND = { name: "StudyLuma", initial: "S" } as const;

export async function loader({ request }: { request: Request }) {
  const session = await getSession(request);
  return { user: session?.user ?? null };
}

export async function action({ request }: { request: Request }) {
  const form = await request.formData();
  const role = form.get("role") as DemoRole | null;

  if (role !== "student" && role !== "teacher") return redirect("/demo");

  const user = await getDemoUser(role);
  if (!user) return redirect("/demo");

  const { pathname } = new URL(request.url);
  return redirect(pathname, {
    headers: { "Set-Cookie": buildSessionCookie(user.id) },
  });
}

function DemoRoleSwitcher({ currentRole, collapsed }: { currentRole: DemoRole; collapsed: boolean }) {
  const targetRole: DemoRole = currentRole === "teacher" ? "student" : "teacher";
  const currentLabel = currentRole === "teacher" ? "Lehrersicht" : "Schülersicht";
  const targetLabel = currentRole === "teacher" ? "Schülersicht" : "Lehrersicht";

  return (
    <Form method="post">
      <input type="hidden" name="role" value={targetRole} />
      {collapsed ? (
        <button
          type="submit"
          title={`Wechseln zu ${targetLabel}`}
          className="flex items-center justify-center w-full py-2.5 rounded-xl text-muted-foreground hover:bg-muted hover:text-foreground transition-colors text-sm"
        >
          ⇄
        </button>
      ) : (
        <div className="px-3 py-2 rounded-xl border border-border bg-muted/40">
          <div className="text-xs text-muted-foreground mb-1.5">Demo · {currentLabel}</div>
          <button
            type="submit"
            className="text-sm text-foreground hover:text-primary transition-colors font-medium"
          >
            Wechseln zu {targetLabel}
          </button>
        </div>
      )}
    </Form>
  );
}

export default function DemoAppLayout() {
  const { user } = useLoaderData<typeof loader>();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const currentRole: DemoRole = user ? demoRoleFromUser(user) : "student";

  const sidebar = (
    <Sidebar
      brand={BRAND}
      mainNavItems={mainNavItems}
      footerNavItems={[]}
      collapsed={sidebarCollapsed}
      onCollapsedChange={setSidebarCollapsed}
      collapsible
      userSlot={
        <DemoRoleSwitcher currentRole={currentRole} collapsed={sidebarCollapsed} />
      }
    />
  );

  return (
    <RouteProvider>
      <Layout
        brand={BRAND}
        mainNavItems={mainNavItems}
        menuNavItems={[]}
        sidebar={sidebar}
      >
        <Outlet />
      </Layout>
    </RouteProvider>
  );
}
