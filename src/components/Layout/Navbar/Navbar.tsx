"use client";

import { BookOpen, LogIn, Menu, Moon, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { AppLink } from "@components/AppLink";
import { getCourseById, getCourseTitle, groupCoursesByAccess } from "@data/courses";
import { useMockAuth } from "@/client/contexts/MockAuthContext";
import { useRouteContext } from "@/client/contexts/RouteContext";
import { useTheme } from "@/client/contexts/ThemeContext";
import { useIsMobile } from "@lib/useMediaQuery";
import type { CourseId } from "@domain/ids";

import { NavbarDesktopLinks } from "./NavbarDesktopLinks";
import { NavbarProfileDropdown } from "./NavbarProfileDropdown";
import styles from "./Navbar.module.css";
import { isAdmin } from "@/domain/userTypes";

type NavbarProps = {
  onSidebarToggle: () => void;
  sidebarExists: boolean;
  isSidebarOpen: boolean;
};

function getCurrentRouteName({
  isHome,
  isLibrary,
  isPrinciples,
  courseId,
}: {
  isHome: boolean;
  isLibrary: boolean;
  isPrinciples: boolean;
  courseId: CourseId | undefined;
}): string | null {
  if (isHome) return null;
  if (isPrinciples) return "Principles";
  if (isLibrary) return "Library";
  if (courseId) {
    const course = getCourseById(courseId);
    return course ? getCourseTitle(course) : null;
  }
  return null;
}

export function Navbar({ onSidebarToggle, sidebarExists, isSidebarOpen }: NavbarProps) {
  const router = useRouter();
  const { isAuthenticated, user, signOut } = useMockAuth();
  const { theme, toggleTheme } = useTheme();
  const routeContext = useRouteContext();
  const isMobile = useIsMobile();

  const accessibleCourses = user ? groupCoursesByAccess(user).accessible : [];
  const activeCourseId = routeContext.courseId ?? null;
  const currentRouteName = getCurrentRouteName({
    isHome: routeContext.isHome,
    isLibrary: routeContext.isLibrary,
    isPrinciples: routeContext.isPrinciples,
    courseId: routeContext.courseId,
  });

  const showHamburger = isMobile || routeContext.hasTopicContext;

  const isUserAdmin = user ? isAdmin(user) : false;
  const primaryGroupKey = user && !isAdmin(user) ? user.groupKey : undefined;

  const handleLogout = () => {
    router.push("/");
    setTimeout(() => {
      toast.success("Logged out successfully");
      signOut();
    }, 100);
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
                aria-label={isSidebarOpen ? "Close sidebar" : "Open sidebar"}
              >
                {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            ) : null}
          </div>

          <div className={styles.brandNav}>
            <AppLink href="/" className={styles.brand}>
              <BookOpen size={20} />
              {(routeContext.isHome || !isMobile) && <span>StudyNode</span>}
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
                  isAuthenticated={isAuthenticated}
                  courses={accessibleCourses}
                  activeCourseId={activeCourseId}
                  isLibrary={routeContext.isLibrary}
                  isPrinciples={routeContext.isPrinciples}
                  groupKey={primaryGroupKey}
                />
              </div>
            ) : null}
          </div>
        </div>

        <div className={styles.right}>
          <button
            className={styles.iconButton}
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
          >
            {theme === "light" ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {isAuthenticated ? (
            <NavbarProfileDropdown
              onLogout={handleLogout}
              isMobile={isMobile}
              isAdmin={isUserAdmin}
            />
          ) : (
            <button className={styles.authButton} onClick={() => router.push("/access")}>
              <LogIn size={18} />
              {!isMobile && <span>Login</span>}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
