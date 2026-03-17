import type { ReactNode } from "react";
import type { SidebarDTO } from "@schema/courseTypes";
import { Sidebar } from "./Sidebar/Sidebar";
import { MobileNav } from "./MobileNav/MobileNav";
import { QuizStartBanner } from "@features/quiz/QuizStartBanner";
import styles from "./Layout.module.css";

type LayoutProps = {
  sidebarData: SidebarDTO;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
  children: ReactNode;
  fullWidth?: boolean;
  suppressQuizBanner?: boolean;
};

export function Layout({
  sidebarData,
  isAdmin,
  signOutAction,
  children,
  fullWidth,
  suppressQuizBanner,
}: LayoutProps) {
  const primaryCourseHref = sidebarData.courses[0]?.href ?? null;

  return (
    <div className={styles.layout}>
      {!isAdmin && sidebarData.isAuthenticated && !suppressQuizBanner && <QuizStartBanner />}
      <Sidebar
        sidebarData={sidebarData}
        isAdmin={isAdmin}
        signOutAction={signOutAction}
      />
      <main className={`${styles.main}${fullWidth ? ` ${styles.mainFullWidth}` : ""}`}>{children}</main>
      <MobileNav
        isAuthenticated={sidebarData.isAuthenticated}
        primaryCourseHref={primaryCourseHref}
        isAdmin={isAdmin}
        enrolledCoursesCount={sidebarData.courses.length}
      />
    </div>
  );
}
