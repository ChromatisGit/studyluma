import "server-only";

import { CourseDTO } from "@/domain/courseDTO";
import { CourseId, resolveCourse } from "./courses";

export function getCourseDTO(courseId: CourseId): CourseDTO {
    const course = resolveCourse(courseId);
    const label = course.courseVariant?.short
        ? `${course.subject.label} (${course.courseVariant.short})`
        : course.subject.label;
    const description = course.courseVariant?.label ?? course.group.label;
    const tags = [course.group.label, course.subject.label];

    if (course.courseVariant?.label) {
        tags.push(course.courseVariant.label);
    }

    return {
        id: course.id,
        label,
        description,
        groupKey: course.group.key,
        subjectKey: course.subject.key,
        slug: course.slug,
        icon: course.icon,
        color: course.color,
        tags,
    };
}
