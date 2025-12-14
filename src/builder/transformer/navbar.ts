import type { NavbarConfig } from "@components/Navbar/GroupBasedNavbar";
import type { ResolvedCourse } from "../prepareCourses";

export function buildNavbarConfig(courses: ResolvedCourse[]) {
  return {
    relativePath: `configs/navbar.config.json`,
    content: JSON.stringify(buildNavbarJSON(courses), null, 2),
  };
}

function buildNavbarJSON(courses: ResolvedCourse[]): NavbarConfig {
  return Object.fromEntries(
    Object.entries(Object.groupBy(courses, (c) => c.group.id)).map(
      ([group, list = []]) => {
        const navbar = list.map((course) => ({
          label: buildLabel(course, list),
          to: `${course.group.id}/${course.slug}`,
          position: "left" as const,
        }));

        navbar.push({
          label: "Leitsätze",
          to: `${group}/group_info`,
          position: "left" as const,
        });

        return [group, navbar];
      },
    ),
  );
}

function buildLabel(course: ResolvedCourse, groupCourses: ResolvedCourse[],): string {
  const subjectLabel = course.subject.label;

  if (groupCourses.length === 1) {
    return "Übersicht";
  }

  const coursesWithSameSubject = groupCourses.filter((item) => item.subject.id === course.subject.id,);
  if (coursesWithSameSubject.length === 1) {
    return subjectLabel;
  }

  const variantEntry = course.courseVariant ? ` (${course.courseVariant.short})` : "";

  return `${subjectLabel}${variantEntry}`;
}
