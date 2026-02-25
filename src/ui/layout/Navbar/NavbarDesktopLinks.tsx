"use client";

import { AppLink } from "@components/AppLink";
import type { SidebarCourseDTO } from "@schema/courseTypes";

import { NavbarCourseLinks } from "./NavbarCourseLinks";
import styles from "./Navbar.module.css";
import LAYOUT_TEXT from "../layout.de.json";

type NavbarDesktopLinksProps = {
  courses: SidebarCourseDTO[];
  activeCourseId: string | null;
  isPrinciples: boolean;
  groupKey?: string;
};

export function NavbarDesktopLinks({
  courses,
  activeCourseId,
  isPrinciples,
  groupKey,
}: NavbarDesktopLinksProps) {
  return (
    <>
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
          {LAYOUT_TEXT.navbar.principles}
        </AppLink>
      ) : null}
    </>
  );
}
