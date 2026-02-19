export type CourseDTO = {
    id: string;
    label: string;
    description: string;
    groupKey: string;
    subjectId: string;
    subjectKey: string;
    slug: string;
    icon?: string;
    color: string;
    tags: string[];
}