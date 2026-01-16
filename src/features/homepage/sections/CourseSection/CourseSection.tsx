import { getSession } from "@/server/auth/auth";
import HOMEPAGE_TEXT from "@homepage/homepage.de.json";
import { HomeSection } from "@homepage/Homepage";
import { getCoursesByAccess } from "@/server/data/courses";
import { getCourseDTO } from "@/server/data/getCourseDTO";
import type { CourseDTO } from "@/domain/courseDTO";
import { isAdmin } from "@/domain/userTypes";
import { Stack } from "@components/Stack";
import { CourseGroup } from "./CourseGroup";

type CourseGroups = {
  accessible: CourseDTO[];
  restricted: CourseDTO[];
  hidden: CourseDTO[];
};

const EMPTY_GROUPS: CourseGroups = {
  accessible: [],
  restricted: [],
  hidden: [],
};

export async function CourseSection() {
  const { courses } = HOMEPAGE_TEXT;
  const session = await getSession();
  const user = session?.user ?? null;

  const accessGroups = getCoursesByAccess(user);
  const groups = accessGroups
    ? {
        accessible: accessGroups.accessible.map((courseId) => getCourseDTO(courseId)),
        restricted: accessGroups.restricted.map((courseId) => getCourseDTO(courseId)),
        hidden: accessGroups.hidden.map((courseId) => getCourseDTO(courseId)),
      }
    : EMPTY_GROUPS;
  const admin = user ? isAdmin(user) : false;

  return (
    <HomeSection id="courses" title={courses.title} subtitle={courses.subtitle}>
      <Stack gap="xl">
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
      </Stack>
    </HomeSection>
  );
}
