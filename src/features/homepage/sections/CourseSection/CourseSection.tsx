"use client";

import { useMemo } from "react";

import { useMockAuth } from "@client/contexts/MockAuthContext";
import styles from "@homepage/sections/CourseSection/CourseSection.module.css";
import HOMEPAGE_TEXT from "@homepage/homepage.de.json";
import { HomeSection } from "@homepage/Homepage";
import { getCoursesByAccess } from "@/server/data/courses";
import { isAdmin } from "@/domain/userTypes";
import { CourseGroup } from "./CourseGroup";

const EMPTY_GROUPS = {
  accessible: [],
  restricted: [],
  hidden: [],
};

export function CourseSection() {
  const { courses } = HOMEPAGE_TEXT;
  const { user } = useMockAuth();

  const groups = useMemo(() => (user ? getCoursesByAccess(user) : EMPTY_GROUPS), [user]);
  const admin = user ? isAdmin(user) : false;

  return (
    <HomeSection id="courses" title={courses.title} subtitle={courses.subtitle}>
      <div className={styles.courseGroups}>
        <CourseGroup
          title={admin? courses.accessibleCoursesAdmin : courses.accessibleCourses}
          courses={groups.accessible}
          actionLabel={courses.openActionLabel}
          accessable={true}
        />

        <CourseGroup
          title={admin? courses.restrictedCoursesAdmin : courses.restrictedCourses}
          courses={groups.restricted}
          actionLabel={admin? courses.openActionLabel : courses.restrictedActionLabel}
          accessable={admin}
        />

        {admin && (
          <CourseGroup
            title={courses.hiddenCoursesAdmin}
            courses={groups.hidden}
            actionLabel={courses.openActionLabel}
            accessable={true}
          />
        )}
      </div>
    </HomeSection>
  );
}
