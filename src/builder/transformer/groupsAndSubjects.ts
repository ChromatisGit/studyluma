import type { GroupsAndSubjects } from "@schema/groupsAndSubjects"

export function buildGroupsAndSubjects(groupsAndSubjects: GroupsAndSubjects) {
    return {
        relativePath: `configs/groupsAndSubjects.config.json`,
        content:  JSON.stringify(groupsAndSubjects, null, 2)
    };
}