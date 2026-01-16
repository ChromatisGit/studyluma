"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { AppLink } from "@components/AppLink";
import type { SidebarCourseDTO } from "@domain/sidebarDTO";
import styles from "./Sidebar.module.css";

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
            Homepage
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
          Homepage
        </AppLink>
      ) : null}

      {shouldShowCoursesDropdown && inactiveCourses.length > 0 ? (
        <div className={styles.topicGroup}>
          <button
            className={styles.coursesToggle}
            onClick={() => setIsCoursesExpanded((prev) => !prev)}
            aria-expanded={isCoursesExpanded}
          >
            <span>Courses</span>
            <ChevronRight
              size={20}
              className={`${styles.topicChevron} ${
                isCoursesExpanded ? styles.topicChevronExpanded : ""
              }`.trim()}
            />
          </button>
          <div
            className={`${styles.coursesContent} ${
              isCoursesExpanded ? styles.coursesContentExpanded : ""
            }`.trim()}
          >
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
          Principles
        </AppLink>
      ) : null}
    </div>
  );
}
