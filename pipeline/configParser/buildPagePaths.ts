import { NestedRecord, ensurePath } from "../../src/server/lib/nestedRecord";
import { WorksheetFormat } from "@schema/course";
import { CoursePlan } from "./schema/coursePlan";

type SubjectId = string;
type TopicId = string;
type ChapterId = string;
type CourseId = string;

type ChapterPaths = Record<ChapterId, {
    chapterId: ChapterId;
    formats: WorksheetFormat[];
    courseIds: CourseId[];
}>;

export type TopicPath = {
    subjectId: SubjectId;
    topicId: TopicId;
    chapters: ChapterPaths;
};


export function buildPagePaths(coursePlans: CoursePlan[]): TopicPath[] {
    const result: NestedRecord<[SubjectId, TopicId], ChapterPaths> = {};

    for (const { subject, id: courseId, topics, worksheetFormat } of coursePlans) {
        const subjectId = subject.id;

        for (const [topicId, chapterIds] of Object.entries(topics)) {
            if (!chapterIds) continue;

            const topicEntry = ensurePath(result, subjectId, topicId) as ChapterPaths;

            for (const chapterId of chapterIds) {
                const chapterEntry =
                    topicEntry[chapterId] ??
                    (topicEntry[chapterId] = { chapterId, formats: [], courseIds: [] });

                if (!chapterEntry.formats.includes(worksheetFormat)) {
                    chapterEntry.formats.push(worksheetFormat);
                }
                if (!chapterEntry.courseIds.includes(courseId)) {
                    chapterEntry.courseIds.push(courseId);
                }
            }
        }
    }

    return Object.entries(result).map(([subjectId, topics]) =>
        Object.entries(topics).map(([topicId, chapters]) => ({ subjectId, topicId, chapters }))
    ).flat();
}
