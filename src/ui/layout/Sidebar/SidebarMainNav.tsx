"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { AppLink } from "@components/AppLink";
import type { SidebarCourseDTO } from "@schema/courseTypes";
import styles from "./Sidebar.module.css";
import LAYOUT_TEXT from "../layout.de.json";

type SidebarMainNavProps = {
  isAuthenticated: boolean;
  courses: SidebarCourseDTO[];
  activeCourseId: string | null;
  groupKey?: string;
  isHome: boolean;
  isPrinciples: boolean;
  onLinkClick: () => void;
};

const MAX_INLINE_COURSES = 2;

export function SidebarMainNav({
  isAuthenticated,
  courses,
  activeCourseId,
  groupKey,
  isHome,
  isPrinciples,
  onLinkClick,
}: SidebarMainNavProps) {
  const [isCoursesExpanded, setIsCoursesExpanded] = useState(false);

  useEffect(() => {
    if (activeCourseId) {
      setIsCoursesExpanded(true);
    }
  }, [activeCourseId]);

  if (!isAuthenticated) {
    return (
      <div className={styles.mainNav}>
        {!isHome ? (
          <AppLink href="/" className={styles.topicLink} onClick={onLinkClick}>
            {LAYOUT_TEXT.sidebar.homepage}
          </AppLink>
        ) : null}
      </div>
    );
  }

  const inactiveCourses = courses.filter((course) => course.id !== activeCourseId);
  const shouldShowCoursesDropdown = courses.length > MAX_INLINE_COURSES;

  return (
    <div className={styles.mainNav}>
      {!isHome ? (
        <AppLink href="/" className={styles.topicLink} onClick={onLinkClick}>
          {LAYOUT_TEXT.sidebar.homepage}
        </AppLink>
      ) : null}

      {shouldShowCoursesDropdown && inactiveCourses.length > 0 ? (
        <div className={styles.topicGroup}>
          <button
            className={styles.coursesToggle}
            onClick={() => setIsCoursesExpanded((prev) => !prev)}
            aria-expanded={isCoursesExpanded}
          >
            <span>{LAYOUT_TEXT.sidebar.courses}</span>
            <ChevronRight
              size={20}
              className={clsx(styles.topicChevron, isCoursesExpanded && styles.topicChevronExpanded)}
            />
          </button>
          <div className={clsx(styles.coursesContent, isCoursesExpanded && styles.coursesContentExpanded)}>
            <ul className={styles.chapterList}>
              {inactiveCourses.map((course) => (
                <li key={course.id} className={styles.chapterItem}>
                  <AppLink
                    href={course.href}
                    className={styles.chapterLink}
                    onClick={onLinkClick}
                  >
                    {course.label}
                  </AppLink>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : (
        inactiveCourses.map((course) => (
          <AppLink
            key={course.id}
            href={course.href}
            className={styles.mainNavLink}
            onClick={onLinkClick}
          >
            {course.label}
          </AppLink>
        ))
      )}

      {!isPrinciples && groupKey ? (
        <AppLink
          href={`/${groupKey}/principles`}
          className={styles.mainNavLink}
          onClick={onLinkClick}
        >
          {LAYOUT_TEXT.sidebar.principles}
        </AppLink>
      ) : null}
    </div>
  );
}
