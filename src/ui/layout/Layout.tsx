import type { ReactNode } from "react";
import type { SidebarDTO } from "@schema/courseTypes";
import { Sidebar } from "./Sidebar/Sidebar";
import { MobileNav } from "./MobileNav/MobileNav";
import styles from "./Layout.module.css";

type LayoutProps = {
  sidebarData: SidebarDTO;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
  children: ReactNode;
  fullWidth?: boolean;
};

export function Layout({
  sidebarData,
  isAdmin,
  signOutAction,
  children,
  fullWidth,
}: LayoutProps) {
  const lastCourseHref = sidebarData.courses[0]?.href ?? null;

  return (
    <div className={styles.layout}>
      <Sidebar
        sidebarData={sidebarData}
        isAdmin={isAdmin}
        signOutAction={signOutAction}
      />
      <main className={`${styles.main}${fullWidth ? ` ${styles.mainFullWidth}` : ""}`}>{children}</main>
      <MobileNav
        isAuthenticated={sidebarData.isAuthenticated}
        lastCourseHref={lastCourseHref}
        isAdmin={isAdmin}
      />
    </div>
  );
}
