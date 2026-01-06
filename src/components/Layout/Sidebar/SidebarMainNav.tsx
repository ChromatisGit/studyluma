"use client";

import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";

import { AppLink } from "@components/AppLink";
import type { Course } from "@/server/schema/course";
import type { CourseId } from "@domain/ids";
import { getCourseTitle } from "@data/courses";
import styles from "./Sidebar.module.css";

type SidebarMainNavProps = {
  isAuthenticated: boolean;
  courses: Course[];
  activeCourseId: CourseId | null;
  groupKey?: string;
  isHome: boolean;
  isLibrary: boolean;
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
  isLibrary,
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
          <AppLink href="/" className={styles.mainNavLink} onClick={onLinkClick}>
            Homepage
          </AppLink>
        ) : null}
        {!isLibrary ? (
          <AppLink href="/library" className={styles.mainNavLink} onClick={onLinkClick}>
            Library
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
        <AppLink href="/" className={styles.mainNavLink} onClick={onLinkClick}>
          Homepage
        </AppLink>
      ) : null}

      {!isLibrary ? (
        <AppLink href="/library" className={styles.mainNavLink} onClick={onLinkClick}>
          Library
        </AppLink>
      ) : null}

      {shouldShowCoursesDropdown && inactiveCourses.length > 0 ? (
        <div className={styles.topicGroup}>
          <div className={styles.topicHeader}>
            <div className={styles.topicLink}>Courses</div>
            <button
              className={styles.topicToggle}
              onClick={() => setIsCoursesExpanded((prev) => !prev)}
              aria-expanded={isCoursesExpanded}
              aria-label="Toggle Courses"
            >
              <ChevronRight
                size={20}
                className={`${styles.topicChevron} ${
                  isCoursesExpanded ? styles.topicChevronExpanded : ""
                }`.trim()}
              />
            </button>
          </div>
          {isCoursesExpanded ? (
            <ul className={styles.chapterList}>
              {inactiveCourses.map((course) => (
                <li key={course.id} className={styles.chapterItem}>
                  <AppLink
                    href={course.slug}
                    className={styles.chapterLink}
                    onClick={onLinkClick}
                  >
                    {getCourseTitle(course)}
                  </AppLink>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        inactiveCourses.map((course) => (
          <AppLink
            key={course.id}
          href={course.slug}
          className={styles.mainNavLink}
          onClick={onLinkClick}
        >
          {getCourseTitle(course)}
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
