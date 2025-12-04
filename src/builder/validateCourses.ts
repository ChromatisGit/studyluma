import type { CoursePlan } from "@schema/coursePlan";
import type { GroupsAndSubjects } from "@schema/groupsAndSubjects";

export function validateCourses(courses: CoursePlan[], groupsAndSubjects: GroupsAndSubjects) {
  const errors: string[] = [];

  const seenSlugs = new Set<string>();

  const byGroupAndSubject = new Map<string, Map<string, CoursePlan[]>>();

  courses.forEach((course) => {
    const slugKey = `${course.group}::${course.slug}`;
    if (seenSlugs.has(slugKey)) {
      errors.push(
        `Duplicate slug '${course.slug}' found in group '${course.group}'.`,
      );
    } else {
      seenSlugs.add(slugKey);
    }

    const subjectMap =
      byGroupAndSubject.get(course.group) ??
      new Map<string, CoursePlan[]>();

    const list = subjectMap.get(course.subject) ?? [];
    subjectMap.set(course.subject, [...list, course]);

    byGroupAndSubject.set(course.group, subjectMap);
  });

  byGroupAndSubject.forEach((subjectMap, group) => {
    subjectMap.forEach((list, subject) => {
      if (list.length <= 1) return;

      list.forEach((course) => {
        if (!course.courseVariant) {
          errors.push(
            `Course '${group}/${course.slug}' is missing 'course.variant' but there are multiple '${subject}' courses in this group.`,
          );
          return;
        }

        if (!groupsAndSubjects.variants[course.courseVariant]) {
          errors.push(
            `Variant '${course.courseVariant}' used in course '${group}/${course.slug}' is not defined in groupsAndSubjects.yml.`,
          );
        }
      });
    });
  });

  if (errors.length) {
    throw new Error(errors.map((msg) => `- ${msg}`).join("\n"));
  }
}