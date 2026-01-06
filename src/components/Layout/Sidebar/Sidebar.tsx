"use client";

import { useMemo } from "react";

import { useMockAuth } from "@/client/contexts/MockAuthContext";
import { useRouteContext } from "@/client/contexts/RouteContext";
import { buildCourseSlug, groupCoursesByAccess } from "@data/courses";
import { getCourseOverview } from "@data/overview";
import { getCourseRoadmap } from "@data/roadmap";
import { useIsMobile } from "@lib/useMediaQuery";
import type { CourseId } from "@domain/ids";
import { isAdmin } from "@domain/userTypes";

import { SidebarMainNav } from "./SidebarMainNav";
import { SidebarTopicNav } from "./SidebarTopicNav";
import styles from "./Sidebar.module.css";

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

type RoadmapCurrentInfo = {
  currentTopicSlug?: string;
  currentChapterSlug?: string;
};

const EMPTY_ROADMAP_INFO: RoadmapCurrentInfo = {
  currentTopicSlug: undefined,
  currentChapterSlug: undefined,
};

function resolveRoadmapCurrentInfo(courseId?: CourseId): RoadmapCurrentInfo {
  if (!courseId) {
    return EMPTY_ROADMAP_INFO;
  }

  const roadmapData = getCourseRoadmap(courseId);
  for (const topicItem of roadmapData) {
    for (const chapterItem of topicItem.chapters) {
      for (const worksheetItem of chapterItem.worksheets) {
        if (worksheetItem.isCurrent) {
          return {
            currentTopicSlug: topicItem.slug,
            currentChapterSlug: chapterItem.slug,
          };
        }
      }
    }
  }

  return EMPTY_ROADMAP_INFO;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const {
    isLibraryRoute,
    courseId,
    groupKey,
    subjectKey,
    subject,
    topic,
    chapter,
    hasTopicContext,
    isHome,
    isLibrary,
    isPrinciples,
  } = useRouteContext();
  const { user, isAuthenticated } = useMockAuth();
  const isMobile = useIsMobile();

  const primaryGroupKey = user && !isAdmin(user) ? user.groupKey : undefined;
  const accessibleCourses = user ? groupCoursesByAccess(user).accessible : [];
  const courseSlug = groupKey && subjectKey ? buildCourseSlug(groupKey, subjectKey) : null;

  const topics = useMemo(() => {
    if (isLibraryRoute) {
      return [];
    }
    if (courseId) {
      const overview = getCourseOverview(courseId);
      return overview?.topics ?? [];
    }
    return [];
  }, [isLibraryRoute, courseId]);

  const roadmapCurrentInfo = resolveRoadmapCurrentInfo(courseId);

  const showTopicNavigation = hasTopicContext && topics.length > 0;
  const showMainNav = isMobile;

  const handleLinkClick = () => {
    if (isMobile) {
      onClose();
    }
  };

  const handleTopicClick = (event: React.MouseEvent) => {
    if (isMobile) {
      const topicElement = event.currentTarget.closest(`.${styles.topicGroup}`);
      const toggle = topicElement?.querySelector("button");
      const isExpanded = toggle?.getAttribute("aria-expanded") === "true";

      if (!isExpanded) {
        event.preventDefault();
        toggle?.click();
        return;
      }
    }
    handleLinkClick();
  };

  const buildTopicUrl = (topicSlug: string): string => {
    if (isLibraryRoute && subject) {
      return `/library/${subject}/${topicSlug}`;
    }
    if (courseSlug) {
      return `${courseSlug}/${topicSlug}`;
    }
    return "/";
  };

  const buildChapterUrl = (topicSlug: string, chapterSlug: string): string => {
    if (isLibraryRoute && subject) {
      return `/library/${subject}/${topicSlug}/${chapterSlug}`;
    }
    if (courseSlug) {
      return `${courseSlug}/${topicSlug}/${chapterSlug}`;
    }
    return "/";
  };

  const hasMainNavSection = showMainNav;
  const hasTopicNavSection = showTopicNavigation;
  const showSeparator = hasMainNavSection && hasTopicNavSection;

  return (
    <>
      {isOpen && isMobile ? (
        <div className={styles.overlay} onClick={onClose} aria-hidden="true" />
      ) : null}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`.trim()}>
        {showMainNav ? (
          <SidebarMainNav
            isAuthenticated={isAuthenticated}
            courses={accessibleCourses}
            activeCourseId={courseId ?? null}
            groupKey={primaryGroupKey}
            isHome={isHome}
            isLibrary={isLibrary}
            isPrinciples={isPrinciples}
            onLinkClick={handleLinkClick}
          />
        ) : null}

        {showSeparator ? <div className={styles.separator} /> : null}

        {showTopicNavigation ? (
          <SidebarTopicNav
            topics={topics}
            currentTopic={topic}
            currentChapter={chapter}
            roadmapCurrentTopic={roadmapCurrentInfo.currentTopicSlug}
            roadmapCurrentChapter={roadmapCurrentInfo.currentChapterSlug}
            buildTopicUrl={buildTopicUrl}
            buildChapterUrl={buildChapterUrl}
            onLinkClick={handleLinkClick}
            onTopicClick={handleTopicClick}
          />
        ) : null}
      </aside>
    </>
  );
}
