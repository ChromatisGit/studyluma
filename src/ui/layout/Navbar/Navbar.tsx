"use client";

import { BookOpen, LogIn, Menu, Moon, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppLink } from "@components/AppLink";
import { useRouteContext } from "@ui/contexts/RouteContext";
import { useTheme } from "@ui/contexts/ThemeContext";
import type { SidebarDTO } from "@schema/courseTypes";

import { NavbarDesktopLinks } from "./NavbarDesktopLinks";
import { NavbarProfileDropdown } from "./NavbarProfileDropdown";
import styles from "./Navbar.module.css";
import { useIsMobile } from "@ui/lib/useMediaQuery";
import LAYOUT_TEXT from "../layout.de.json";

type NavbarProps = {
  onSidebarToggle: () => void;
  sidebarExists: boolean;
  isSidebarOpen: boolean;
  data: SidebarDTO;
  isAdmin: boolean;
  activeCourseLabel?: string | null;
  signOutAction: () => Promise<void>;
};

function getCurrentRouteName({
  isHome,
  isPrinciples,
  activeCourseLabel,
}: {
  isHome: boolean;
  isPrinciples: boolean;
  activeCourseLabel?: string | null;
}): string | null {
  if (isHome) return null;
  if (isPrinciples) return LAYOUT_TEXT.navbar.principles;
  if (activeCourseLabel) return activeCourseLabel;
  return null;
}

export function Navbar({
  onSidebarToggle,
  sidebarExists,
  isSidebarOpen,
  data,
  isAdmin,
  activeCourseLabel,
  signOutAction,
}: NavbarProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const routeContext = useRouteContext();
  const isMobile = useIsMobile();

  const isAdminView = routeContext.isAdminView;
  const adminCourseId = routeContext.adminCourseId ?? null;
  const activeCourseId = isAdminView ? adminCourseId : (routeContext.courseId ?? null);
  const currentRouteName = getCurrentRouteName({
    isHome: routeContext.isHome,
    isPrinciples: routeContext.isPrinciples,
    activeCourseLabel,
  });

  const showHamburger = isMobile || routeContext.hasTopicContext;

  // Admin panel link logic:
  // - In admin course view: go back to the course page
  // - In admin overview: stay at /admin
  // - In slide view (topic context): go to general /admin
  // - In regular course view: go to course-specific admin
  let adminPanelLink: string;
  if (isAdminView) {
    if (adminCourseId) {
      const course = data.courses.find((c) => c.id === adminCourseId);
      adminPanelLink = course ? course.href : "/admin";
    } else {
      adminPanelLink = "/admin";
    }
  } else if (routeContext.hasTopicContext) {
    adminPanelLink = "/admin";
  } else {
    adminPanelLink = activeCourseId ? `/admin/${activeCourseId}` : "/admin";
  }

  const handleLogout = () => {
    void (async () => {
      try {
        await signOutAction();
      } catch {
        toast.error("Unable to log out right now.");
        return;
      }
      router.push("/");
      toast.success("Logged out successfully");
    })();
  };

  return (
    <nav className={styles.navbar}>
      <div className={styles.container}>
        <div className={styles.left}>
          <div className={styles.hamburgerWrapper}>
            {showHamburger && sidebarExists ? (
              <button
                className={styles.hamburger}
                onClick={onSidebarToggle}
                aria-label={isSidebarOpen ? LAYOUT_TEXT.navbar.closeSidebar : LAYOUT_TEXT.navbar.openSidebar}
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            ) : null}
          </div>

          <div className={styles.brandNav}>
            <AppLink href="/" className={styles.brand}>
              <BookOpen size={20} />
              {(routeContext.isHome || !isMobile) && (
                <span className={styles.brandText}>{LAYOUT_TEXT.navbar.brand}</span>
              )}
            </AppLink>

            {isMobile && currentRouteName ? (
              <>
                <span className={styles.separator}>|</span>
                <span className={styles.currentRoute}>{currentRouteName}</span>
              </>
            ) : null}

            {!isMobile ? (
              <div className={styles.desktopLinks}>
                <NavbarDesktopLinks
                  courses={data.courses}
                  activeCourseId={activeCourseId}
                  isPrinciples={routeContext.isPrinciples}
                  groupKey={data.primaryGroupKey}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.right}>
          <button
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={theme === "light" ? LAYOUT_TEXT.navbar.switchToDark : LAYOUT_TEXT.navbar.switchToLight}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {data.isAuthenticated ? (
            <NavbarProfileDropdown
              onLogout={handleLogout}
              isMobile={isMobile}
              isAdmin={isAdmin}
              adminPanelLink={adminPanelLink}
              accessCode={data.accessCode}
            />
          ) : (
            <button className={styles.authButton} onClick={() => router.push("/access")}>
              <LogIn size={18} />
              {!isMobile && <span>{LAYOUT_TEXT.navbar.login}</span>}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
