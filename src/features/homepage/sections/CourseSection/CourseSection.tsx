import HOMEPAGE_TEXT from "@homepage/homepage.de.json";
import { HomeSection } from "@homepage/Homepage";
import type { CourseDTO } from "@schema/courseTypes";
import { Stack } from "@components/Stack";
import { CourseGroup } from "./CourseGroup";

export type CourseGroups = {
  public: CourseDTO[];
  accessible: CourseDTO[];
  restricted: CourseDTO[];
  hidden: CourseDTO[];
};

type CourseSectionProps = {
  groups: CourseGroups;
  isAdmin: boolean;
};

export function CourseSection({ groups, isAdmin }: CourseSectionProps) {
  const { courses } = HOMEPAGE_TEXT;

  return (
    <HomeSection id="courses" title={courses.title} subtitle={courses.subtitle}>
      <Stack gap="xl">

        <CourseGroup
          title={isAdmin ? courses.accessibleCoursesAdmin : courses.accessibleCourses}
          courses={groups.accessible}
          actionLabel={courses.openActionLabel}
          accessable={true}
        />

        <CourseGroup
          title={courses.publicCourses}
          courses={groups.public}
          actionLabel={courses.openActionLabel}
          accessable={true}
        />

        <CourseGroup
          title={courses.restrictedCourses}
          courses={groups.restricted}
          actionLabel={courses.restrictedActionLabel}
          accessable={false}
        />

        {isAdmin && (
          <CourseGroup
            title={courses.hiddenCourses}
            courses={groups.hidden}
            actionLabel={courses.openActionLabel}
            accessable={true}
          />
        )}
      </Stack>
    </HomeSection>
  );
}

