import { NestedRecord, ensurePath } from "./nestedRecord";
import { Course, Topic } from "@schema/course";
import { TopicPath } from "../configParser/buildPagePaths";
import { CoursePlan } from "../configParser/schema/coursePlan";
import { parsePage } from "../pageParser/parsePage";
import { PageSummaries } from "./buildChapterContent";
import { ContentIssueCollector } from "../errorHandling";

type WorksheetSummary = { worksheetId: string; label: string };
type ChapterSummary = { label: string; worksheets: WorksheetSummary[] };

export function resolveCourses(coursePlans: CoursePlan[], pageSummaries: PageSummaries, topicLabels: TopicLabelMap): Course[] {
    return coursePlans.map((course) => {
        const { topics, slug, subject, worksheetFormat } = course;
        const resolvedTopics: Topic[] = Object.entries(topics).flatMap(([topicId, chapterIds]) => {
            if (!chapterIds) return [];

            const topicSummary = pageSummaries[subject.id][topicId] as Record<string, ChapterSummary>;
            return [{
                topicId,
                label: topicLabels[subject.id][topicId],
                href: `${slug}/${topicId}`,
                chapters: chapterIds.map((chapterId) => {
                    const {label, worksheets}  = topicSummary[chapterId]
                    return {
                        chapterId,
                        label,
                        href: `${slug}/${topicId}/${chapterId}`,
                        worksheets: worksheets.map((worksheet) => {

                            return {
                                ...worksheet,
                                worksheetFormat,
                                href: `${slug}/${topicId}/${chapterId}/${worksheet.worksheetId}`
                            }
                        })
                    }
                })
            }]
        })

        return {
            ...course,
            topics: resolvedTopics
        } as Course
    })
}

type SubjectId = string;
type TopicId = string;
type Label = string;

type TopicLabelMap = NestedRecord<[SubjectId, TopicId], Label>;

export async function getTopicLabels(pagePaths: TopicPath[]): Promise<TopicLabelMap> {
    const topicLabels: TopicLabelMap = {} as TopicLabelMap;
    const collector = new ContentIssueCollector();

    for (const { subjectId, topicId, chapters } of pagePaths) {
        const subjectEntry = ensurePath(topicLabels, subjectId) as Record<TopicId, Label>;
        const topicCourseIds = collectCourseIds(chapters);
        const topicBase = `base/${subjectId}/${topicId}`;
        const topicFile = `${topicBase}/chapters.typ`;

        try {
            const { title } = await parsePage(topicFile, false);
            subjectEntry[topicId] = title;
        } catch (err) {
            collector.add(err, {
                subjectId,
                topicId,
                basePath: topicBase,
                courseIds: topicCourseIds,
                filePath: `content/${topicFile}`,
            });
        }
    }

    collector.throwIfAny("Content issues found");
    return topicLabels;
}

function collectCourseIds(chapters: Record<string, { courseIds: string[] }>): string[] {
    const ids = new Set<string>();
    for (const chapter of Object.values(chapters)) {
        for (const courseId of chapter.courseIds) {
            ids.add(courseId);
        }
    }
    return [...ids];
}
