import HOMEPAGE_TEXT from "@homepage/homepage.de.json";
import { HomeSection } from "@homepage/Homepage";
import type { CourseDTO } from "@schema/courseTypes";
import { CourseGroup } from "./CourseGroup";

type CourseSectionProps = {
  courses: CourseDTO[];
};

export function CourseSection({ courses }: CourseSectionProps) {
  const { courses: coursesText } = HOMEPAGE_TEXT;

  return (
    <HomeSection id="courses" title={coursesText.title} subtitle={coursesText.subtitle}>
      <CourseGroup
        title={coursesText.publicCourses}
        courses={courses}
        actionLabel={coursesText.openActionLabel}
        accessable={true}
      />
    </HomeSection>
  );
}
