"use client";

import { useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { useRouteContext } from "@ui/contexts/RouteContext";
import { SidebarTopicNav } from "./SidebarTopicNav";
import {
  GraduationCap,
  BookOpen,
  Moon,
  Sun,
  LogOut,
  LogIn,
  ChevronLeft,
  ChevronRight,
  Zap,
  ShieldCheck,
} from "lucide-react";
import clsx from "clsx";
import { AppLink } from "@components/AppLink";
import { ConfigableIcon, type IconName } from "@components/ConfigableIcon/ConfigableIcon";
import { useTheme } from "@ui/contexts/ThemeContext";
import type { SidebarDTO } from "@schema/courseTypes";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  sidebarData: SidebarDTO;
  isAdmin: boolean;
  signOutAction: () => Promise<void>;
};

export function Sidebar({
  sidebarData,
  isAdmin,
  signOutAction,
}: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(pathname === "/");
  const [isPending, startTransition] = useTransition();
  const { theme, toggleTheme } = useTheme();
  const { topic, chapter, hasTopicContext, courseId, worksheet } = useRouteContext();
  const openInNewTab = !!worksheet;

  const showTopicNav = hasTopicContext && sidebarData.topics.length > 0 && !collapsed;

  const isActive = (href: string) => {
    if (href === "/practice") return pathname.startsWith("/practice");
    return pathname.startsWith(href);
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await signOutAction();
    });
  };

  return (
    <aside className={clsx(styles.sidebar, collapsed && styles.collapsed)}>
      {/* Collapse toggle — protrudes outside the inner wrapper */}
      <button
        type="button"
        className={styles.toggle}
        onClick={() => setCollapsed((c) => !c)}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
      </button>

      <div className={styles.sidebarInner}>
      {/* Brand */}
      <div className={styles.header}>
        <AppLink href="/" className={styles.brand}>
          <div className={styles.brandIcon}>
            <GraduationCap size={18} />
          </div>
          {!collapsed && <span className={styles.brandName}>StudyNode</span>}
        </AppLink>
      </div>

      {/* Nav */}
      <nav className={clsx(styles.nav, showTopicNav && styles.navFixed)} aria-label="Main navigation">
        {sidebarData.isAuthenticated && (
          <>
            <AppLink
              href="/practice"
              className={clsx(styles.navItem, isActive("/practice") && styles.active)}
            >
              <BookOpen size={18} className={styles.icon} aria-hidden />
              {!collapsed && <span>Practice</span>}
            </AppLink>

            {sidebarData.courses.length > 0 && (
              <>
                {!collapsed && (
                  <p className={styles.sectionLabel}>Meine Kurse</p>
                )}
                {sidebarData.courses.map((course) => (
                  <AppLink
                    key={course.id}
                    href={course.href}
                    className={clsx(
                      styles.navItem,
                      isActive(course.href) && styles.active,
                    )}
                  >
                    <ConfigableIcon
                      iconKey={(course.icon as IconName) ?? "book-open"}
                      size={18}
                      className={styles.icon}
                    />
                    {!collapsed && (
                      <span className={styles.courseLabel}>{course.label}</span>
                    )}
                  </AppLink>
                ))}
              </>
            )}
          </>
        )}
      </nav>

      {showTopicNav ? (
        <>
          <div className={styles.separator} />
          <SidebarTopicNav
            topics={sidebarData.topics}
            currentTopic={topic}
            currentChapter={chapter}
            progressCurrentTopicId={sidebarData.currentTopicId}
            progressCurrentChapterId={sidebarData.currentChapterId}
            onLinkClick={() => {}}
            openInNewTab={openInNewTab}
          />
        </>
      ) : null}

      {/* Bottom section */}
      <div className={styles.bottom}>
        {isAdmin && (
          <AppLink
            href={courseId ? `/admin/${courseId}` : "/admin"}
            className={clsx(styles.navItem, styles.bottomBtn)}
          >
            <ShieldCheck size={18} className={styles.icon} aria-hidden />
            {!collapsed && <span>Admin</span>}
          </AppLink>
        )}

        <button
          type="button"
          className={clsx(styles.navItem, styles.bottomBtn)}
          onClick={toggleTheme}
          aria-label="Toggle theme"
        >
          {theme === "dark" ? (
            <Sun size={18} className={styles.icon} aria-hidden />
          ) : (
            <Moon size={18} className={styles.icon} aria-hidden />
          )}
          {!collapsed && <span>Theme</span>}
        </button>

        {sidebarData.isAuthenticated ? (
          <>
            <button
              type="button"
              className={clsx(styles.navItem, styles.bottomBtn)}
              onClick={handleSignOut}
              disabled={isPending}
              aria-label="Log out"
            >
              <LogOut size={18} className={styles.icon} aria-hidden />
              {!collapsed && <span>Logout</span>}
            </button>

            {/* User info card — only when expanded */}
            {!collapsed && (sidebarData.accessCode || sidebarData.badge) && (
              <div className={styles.userCard}>
                <div className={styles.userRow}>
                  {sidebarData.badge && (
                    <span className={styles.badge} aria-hidden>
                      {sidebarData.badge}
                    </span>
                  )}
                  <span className={styles.username}>
                    {sidebarData.accessCode ?? "Student"}
                  </span>
                  {isAdmin && (
                    <span className={styles.adminChip}>Admin</span>
                  )}
                </div>
                {sidebarData.xp !== undefined && (
                  <div className={styles.xpRow}>
                    <Zap size={12} aria-hidden />
                    <span>{sidebarData.xp} XP</span>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <AppLink
            href="/access"
            className={clsx(styles.navItem, styles.bottomBtn)}
          >
            <LogIn size={18} className={styles.icon} aria-hidden />
            {!collapsed && <span>Login</span>}
          </AppLink>
        )}
      </div>
      </div>{/* sidebarInner */}
    </aside>
  );
}
