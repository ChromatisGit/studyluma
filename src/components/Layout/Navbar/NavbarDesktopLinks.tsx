"use client";

import { AppLink } from "@components/AppLink";
import type { Course } from "@/server/schema/course";
import type { CourseId } from "@domain/ids";

import { NavbarCourseLinks } from "./NavbarCourseLinks";
import styles from "./Navbar.module.css";

type NavbarDesktopLinksProps = {
  isAuthenticated: boolean;
  courses: Course[];
  activeCourseId: CourseId | null;
  isLibrary: boolean;
  isPrinciples: boolean;
  groupKey?: string;
};

export function NavbarDesktopLinks({
  isAuthenticated,
  courses,
  activeCourseId,
  isLibrary,
  isPrinciples,
  groupKey,
}: NavbarDesktopLinksProps) {
  if (!isAuthenticated) {
    return (
      <AppLink
        href="/library"
        className={styles.link}
        active={isLibrary}
        activeClassName={styles.linkActive}
      >
        Library
      </AppLink>
    );
  }

  return (
    <>
      <AppLink
        href="/library"
        className={styles.link}
        active={isLibrary}
        activeClassName={styles.linkActive}
      >
        Library
      </AppLink>

      {courses.length > 0 ? (
        <NavbarCourseLinks courses={courses} activeCourseId={activeCourseId} />
      ) : null}

      {groupKey ? (
        <AppLink
          href={`/${groupKey}/principles`}
          className={styles.link}
          active={isPrinciples}
          activeClassName={styles.linkActive}
        >
          Principles
        </AppLink>
      ) : null}
    </>
  );
}
