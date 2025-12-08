import type { AccentColor } from "@schema/colors";
import type { ResolvedCourse } from "../prepareCourses";

export type Course = {
  group: string;
  slug: string;
  title: string;
  description: string;
  tags: string[];
  color: AccentColor;
  icon: string;
};


export function buildCoursesConfig(courses: ResolvedCourse[]) {
    const content: Course[] = courses.map((course) => {
        const descriptionBase =
          course.currentChapter?.label ??
          course.topics.find((t) => t.chapters.length)?.chapters[0]?.label ??
          course.topics[0]?.label ??
          "";

        const tags = [course.group.label, course.subject.label];
        if (course.courseVariant) {
            tags.push(course.courseVariant.label);
        }

        return {
            group: course.group.id,
            slug: course.slug,
            title: `${course.subject.label} ${course.group.label}`,
            description: `Aktuelles Thema: ${descriptionBase}`,
            tags,
            color: course.group.color,
            icon: course.subject.icon
        }
    })

    return {
        relativePath: `configs/courses.config.json`,
        content: JSON.stringify(content, null, 2)
    };
}
