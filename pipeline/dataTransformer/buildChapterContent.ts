import { TopicPath } from "@pipeline/configParser/buildPagePaths";
import { getFileNames, getFolderNames, writeJSONFile } from "@pipeline/io";
import { ContentIssueCollector, issueCatalog, type ContentIssue } from "@pipeline/errorHandling";
import { parsePage } from "@pipeline/pageParser/parsePage";
import { WorksheetFormat } from "@schema/course";
import { NestedRecord, ensurePath } from "./nestedRecord";
import { fileNameToId } from "@pipeline/pageParser/utils/fileNameToId";
import { collectCourseIds } from "@pipeline/types";

type WorksheetSummary = { worksheetId: string; label: string };

type SubjectId = string;
type TopicId = string;
type ChapterId = string;


type PdfConversionPath = { source: string; target: string };

export type PageSummaries = NestedRecord<[SubjectId, TopicId, ChapterId], ChapterSummary>;

type ChapterSummary = {
    label: string;
    worksheets: WorksheetSummary[];
};

export async function buildChapterContent(
    topicPaths: TopicPath[]
): Promise<{ pageSummaries: PageSummaries; pdfConversionPaths: PdfConversionPath[] }> {
    const pageSummaries: PageSummaries = {} as PageSummaries;
    const pdfConversionPaths: PdfConversionPath[] = [];
    const collector = new ContentIssueCollector();

    for (const { subjectId, topicId, chapters } of topicPaths) {
        const topicEntry = ensurePath(pageSummaries, subjectId, topicId) as Record<ChapterId, ChapterSummary>;

        const basePath = `base/${subjectId}/${topicId}`;
        const contentBasePath = `content/${basePath}`;
        const topicCourseIds = collectCourseIds(chapters);

        let folders: string[] = [];
        try {
            folders = await getFolderNames(basePath);
        } catch (err) {
            collector.addIssue(
                { ...issueCatalog.missingFolder(contentBasePath), filePath: contentBasePath, cause: err },
                { subjectId, topicId, basePath, courseIds: topicCourseIds }
            );
        }

        const { map: chapterFolderMap, issues: mappingIssues } = mapChapterToFolders(
            Object.keys(chapters),
            folders
        );
        collector.addIssues(mappingIssues, { subjectId, topicId, basePath, filePath: contentBasePath, courseIds: topicCourseIds });

        for (const [chapterId, chapterConfig] of Object.entries(chapters)) {
            const chapterFolder = chapterFolderMap[chapterId];
            if (!chapterFolder) {
                collector.addIssue(
                    issueCatalog.missingChapterFolder(
                        chapterId,
                        `"<number>-${chapterId}" or "${chapterId}"`
                    ),
                    {
                        subjectId,
                        topicId,
                        chapterId,
                        basePath,
                        courseIds: chapterConfig.courseIds,
                        filePath: contentBasePath,
                    }
                );
                continue;
            }

            const chapterBase = `${basePath}/${chapterFolder}`;

            const chapterResult = await processChapter(
                { subjectId, topicId, chapterId, chapterBase, formats: chapterConfig.formats, courseIds: chapterConfig.courseIds },
                collector
            );

            if (chapterResult.chapterSummary) {
                topicEntry[chapterId] = chapterResult.chapterSummary;
            }
            pdfConversionPaths.push(...chapterResult.pdfConversionPaths);
        }
    }

    collector.throwIfAny("Content issues found");
    return { pageSummaries, pdfConversionPaths };
}

type ProcessChapterInput = {
    subjectId: string;
    topicId: string;
    chapterId: string;
    chapterBase: string;
    formats: WorksheetFormat[];
    courseIds: string[];
};

async function processChapter(
    chapterInput: ProcessChapterInput,
    collector: ContentIssueCollector
): Promise<{
    chapterSummary: ChapterSummary | null;
    pdfConversionPaths: PdfConversionPath[];
}> {
    const { subjectId, topicId, chapterId, chapterBase, formats, courseIds } = chapterInput;
    const ctx = { subjectId, topicId, chapterId, courseIds, basePath: chapterBase };

    let overviewPage: Awaited<ReturnType<typeof parsePage>> | null = null;
    const overviewPath = `content/${chapterBase}/overview.typ`;

    try {
        overviewPage = await parsePage(`${chapterBase}/overview.typ`);
        if (!overviewPage.content || overviewPage.content.length === 0) {
            collector.addIssue(issueCatalog.emptyOverviewContent(), { ...ctx, filePath: overviewPath });
            overviewPage = null;
        } else {
            await writeJSONFile(`${subjectId}/${topicId}/${chapterId}`, overviewPage);
        }
    } catch (err) {
        collector.add(err, { ...ctx, filePath: overviewPath });
    }

    const { worksheetSummaries, pdfConversionPaths } = await processWorksheets(
        {
            subjectId,
            topicId,
            chapterId,
            worksheetsDir: `${chapterBase}/worksheets`,
            formats,
        },
        collector,
        ctx
    );

    if (!overviewPage) {
        return { chapterSummary: null, pdfConversionPaths };
    }

    return {
        chapterSummary: {
            label: overviewPage.title,
            worksheets: worksheetSummaries,
        },
        pdfConversionPaths,
    };
}

type ProcessWorksheetsInput = {
    subjectId: string;
    topicId: string;
    chapterId: string;
    worksheetsDir: string;
    formats: WorksheetFormat[]
};

async function processWorksheets(
    input: ProcessWorksheetsInput,
    collector: ContentIssueCollector,
    ctx: {
        subjectId: string;
        topicId: string;
        chapterId: string;
        courseIds: string[];
        basePath: string;
    }
): Promise<{ worksheetSummaries: WorksheetSummary[]; pdfConversionPaths: PdfConversionPath[] }> {
    const { subjectId, topicId, chapterId, worksheetsDir, formats } = input;

    const hasWebWorksheets = formats.includes("web");
    const hasPdfWorksheets = formats.includes("pdf");

    let fileNames: string[] = [];
    try {
        fileNames = await getFileNames(worksheetsDir);
    } catch {
        return { worksheetSummaries: [], pdfConversionPaths: [] };
    }

    const worksheetFileNames = fileNames.filter((f) => f.endsWith(".typ"))

    const worksheetSummaries: WorksheetSummary[] = [];
    const pdfConversionPaths: PdfConversionPath[] = [];

    for (const worksheetName of worksheetFileNames) {
        const sourcePath = `${worksheetsDir}/${worksheetName}`;
        let worksheetPage: Awaited<ReturnType<typeof parsePage>>;

        try {
            worksheetPage = await parsePage(sourcePath, hasWebWorksheets);
        } catch (err) {
            collector.add(err, { ...ctx, filePath: `content/${sourcePath}` });
            continue;
        }

        const worksheetId = fileNameToId(worksheetPage.title)
        const targetPath = `${subjectId}/${topicId}/${chapterId}/worksheets/${worksheetId}`;

        if (hasWebWorksheets && worksheetPage) {
            if (!worksheetPage.content || worksheetPage.content.length === 0) {
                collector.addIssue(issueCatalog.emptyOverviewContent(), { ...ctx, filePath: sourcePath });
            }
            else {
                await writeJSONFile(targetPath, worksheetPage);
            }

        }

        if (hasPdfWorksheets) {
            pdfConversionPaths.push({
                source: sourcePath,
                target: targetPath,
            });
        }

        worksheetSummaries.push({ worksheetId, label: worksheetPage.title });
    }

    return { worksheetSummaries, pdfConversionPaths };
}

type FolderName = string;

function mapChapterToFolders(
    chapterIds: ChapterId[],
    chapterFolders: FolderName[]
): { map: Record<ChapterId, FolderName>; issues: ContentIssue[] } {
    const folderMap = new Map<ChapterId, FolderName>();
    const issues: ContentIssue[] = [];

    for (const folder of chapterFolders) {
        const chapterId = folder.replace(/^\d+-/, "");

        if (folderMap.has(chapterId)) {
            issues.push(
                issueCatalog.duplicateChapterFolder(chapterId, folderMap.get(chapterId) ?? "", folder)
            );
            continue;
        }

        folderMap.set(chapterId, folder);
    }

    const result: Record<ChapterId, FolderName> = {};

    for (const chapterId of chapterIds) {
        const folder = folderMap.get(chapterId);
        if (!folder) continue;
        result[chapterId] = folder;
    }

    return { map: result, issues };
}
