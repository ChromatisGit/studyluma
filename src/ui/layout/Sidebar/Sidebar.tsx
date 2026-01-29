"use client";

import clsx from "clsx";
import { useRouteContext } from "@ui/contexts/RouteContext";
import { useIsMobile } from "@ui/lib/useMediaQuery";
import type { SidebarDTO } from "@schema/sidebarDTO";

import { SidebarMainNav } from "./SidebarMainNav";
import { SidebarTopicNav } from "./SidebarTopicNav";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  data: SidebarDTO;
};

export function Sidebar({ isOpen, onClose, data }: SidebarProps) {
  const {
    courseId,
    topic,
    chapter,
    hasTopicContext,
    isHome,
    isPrinciples,
  } = useRouteContext();
  const isMobile = useIsMobile();

  const showTopicNavigation = hasTopicContext && data.topics.length > 0;
  const showMainNav = isMobile;

  const handleLinkClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  const hasMainNavSection = showMainNav;
  const hasTopicNavSection = showTopicNavigation;
  const showSeparator = hasMainNavSection && hasTopicNavSection;

  return (
    <>
      {isOpen && isMobile ? (
        <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside className={clsx(styles.sidebar, isOpen && styles.sidebarOpen)}>
        {showMainNav ? (
          <SidebarMainNav
            isAuthenticated={data.isAuthenticated}
            courses={data.courses}
            activeCourseId={courseId ?? null}
            groupKey={data.primaryGroupKey}
            isHome={isHome}
            isPrinciples={isPrinciples}
            onLinkClick={handleLinkClick}
          />
        ) : null}

        {showSeparator ? <div className={styles.separator} /> : null}

        {showTopicNavigation ? (
          <SidebarTopicNav
            topics={data.topics}
            currentTopic={topic}
            currentChapter={chapter}
            progressCurrentTopicId={data.currentTopicId}
            progressCurrentChapterId={data.currentChapterId}
            onLinkClick={handleLinkClick}
          />
        ) : null}
      </aside>
    </>
  );
}
