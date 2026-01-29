"use client";

import clsx from "clsx";
import { ChevronDown } from "lucide-react";

import { AppLink } from "@components/AppLink";
import type { SidebarCourseDTO } from "@schema/sidebarDTO";
import { NavbarDropdown } from "./NavbarDropdown";
import styles from "./Navbar.module.css";
import LAYOUT_TEXT from "../layout.de.json";

type NavbarCourseLinksProps = {
  courses: SidebarCourseDTO[];
  activeCourseId: string | null;
};

const MAX_INLINE_COURSES = 2;

export function NavbarCourseLinks({ courses, activeCourseId }: NavbarCourseLinksProps) {
  const shouldUseDropdown = courses.length > MAX_INLINE_COURSES;
  const activeCourse = courses.find((c) => c.id === activeCourseId);
  const otherCourses = courses.filter((c) => c.id !== activeCourseId);

  if (shouldUseDropdown) {
    // When inside a course: show active course label with chevron, dropdown has other courses
    // When not inside a course: show "Courses" with chevron, dropdown has all courses
    const triggerLabel = activeCourse ? activeCourse.label : LAYOUT_TEXT.navbar.courses;
    const dropdownCourses = activeCourse ? otherCourses : courses;

    return (
      <NavbarDropdown
        trigger={(isOpen) => (
          <button className={clsx(styles.link, styles.dropdownTrigger, activeCourse && styles.linkActive)}>
            {triggerLabel}
            <ChevronDown
              size={14}
              className={clsx(styles.dropdownIcon, isOpen && styles.dropdownIconOpen)}
            />
          </button>
        )}
        align="left"
      >
        {dropdownCourses.map((course) => (
          <AppLink
            key={course.id}
            href={course.href}
            className={clsx(styles.dropdownItem, styles.courseDropdownItem)}
          >
            {course.label}
          </AppLink>
        ))}
      </NavbarDropdown>
    );
  }

  return (
    <>
      {courses.map((course) => {
        const isActive = activeCourseId === course.id;
        return (
          <AppLink
            key={course.id}
            href={course.href}
            className={styles.link}
            active={isActive}
            activeClassName={styles.linkActive}
          >
            {course.label}
          </AppLink>
        );
      })}
    </>
  );
}
