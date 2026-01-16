import { worksheetFormatEnum, type Topic, type WorksheetFormat } from "@/domain/courseContent";

export type Courses = Course[];

export type Course = {
    id: string;
    group: { id: string; label: string; key: string };
    subject: { id: string; label: string; key: string };
    courseVariant?: { id: string; label: string; short: string };
    slug: string;
    icon?: string;
    color: string;
    isListed: boolean;
    isPublic: boolean;
    topics: Topic[]
};

export { worksheetFormatEnum };
export type { Topic, WorksheetFormat };
