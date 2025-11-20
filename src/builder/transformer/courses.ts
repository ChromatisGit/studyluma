import type { CoursePlan } from "@schema/coursePlan"

export function buildCoursesConfig(courses: CoursePlan[]) {
    const content = courses.map(c => {
        const { group, course_variant } = c
        return { group, course_variant }
    })

    return {
        relativePath: `courses.config.json`,
        content:  JSON.stringify(content, null, 2)
    };
}