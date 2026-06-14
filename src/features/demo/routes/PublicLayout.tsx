import { useState } from "react";
import { Outlet } from "react-router";
import { Sidebar } from "@chromatis/base";
import { Milestone, Play } from "lucide-react";
import type { NavItem } from "@chromatis/base";

const BRAND = { name: "StudyLuma", initial: "S", href: "/" } as const;

const NAV_ITEMS: readonly NavItem[] = [
  { path: "/demo", label: "Demo", icon: Play },
  { path: "/roadmap", label: "Roadmap", icon: Milestone },
];

export default function PublicLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex h-full bg-background">
      <aside className="hidden md:flex flex-shrink-0">
        <Sidebar
          brand={BRAND}
          mainNavItems={NAV_ITEMS}
          collapsed={collapsed}
          onCollapsedChange={setCollapsed}
          collapsible
        />
      </aside>
      <div className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </div>
    </div>
  );
}
