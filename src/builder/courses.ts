import type { CoursePlan } from "@schema/course-plan"

export function buildCoursesList(courses: CoursePlan[]) {
    return courses.map(c => {
        const { group, course_variant } = c
        return { group, course_variant }
    })
}