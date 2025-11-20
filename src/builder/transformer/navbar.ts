import type { CoursePlan } from "@schema/coursePlan"

export function buildNavbarConfig(courses: CoursePlan[]) {
    return {
        relativePath: `navbar.config.json`,
        content:  JSON.stringify(buildNavbarJSON(courses), null, 2)
    };
}


function buildNavbarJSON(courses: CoursePlan[]) {
    return Object.fromEntries(
        Object.entries(Object.groupBy(courses, c => c.group)).map(([group, list = []]) => {

            if (list.length === 1) {
                list[0].label = 'Übersicht';
            } else {
                updateLabelIfUnique(list, 'math', 'Mathematik');
                updateLabelIfUnique(list, 'info', 'Informatik');
            }

            const navbar = list.map(({ label, group, course_variant }) => ({
                label,
                to: `${group}/${course_variant}`,
                position: 'left'
            }));

            navbar.push({ label: 'Leitsätze', to: `${group}/principles`, position: 'left' })

            return [group, navbar];
        })
    );
}

function updateLabelIfUnique(data: CoursePlan[], subject: string, newLabel: string) {
    const items = data.filter(item => item.subject === subject);
    if (items.length === 1) {
        items[0].label = newLabel;
    }
}