import "server-only";

import { CourseDTO } from "@schema/courseDTO";
import { CourseId, resolveCourse } from "./courseService";

export function getCourseDTO(courseId: CourseId): CourseDTO {
    const course = resolveCourse(courseId);
    const label = course.courseVariant?.short
        ? `${course.subject.label} (${course.courseVariant.short})`
        : course.subject.label;
    const description = course.group.label;
    const tags = [course.subject.label];

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
        tags
    };
}

