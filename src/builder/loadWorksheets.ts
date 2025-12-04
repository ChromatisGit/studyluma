import { Status } from "@schema/overview";
import { protectCodeBlocks } from "@worksheet/utils/codeBlocks";
import { extractTitle } from "@worksheet/utils/worksheetParsing";
import { WorksheetLocation, WorksheetProcess, WorksheetRef } from "@worksheet/worksheetFiles";
import { globContent, readContentFile } from "./io";
import { ResolvedCourse, WorksheetFormat } from "./prepareCourses";

type WorksheetFolder = {
  sourceDir: string;
  targetBase: string;
  process: WorksheetProcess;
  worksheetsRef: WorksheetRef[];
};

export async function getAllWorksheets(
  courses: ResolvedCourse[],
): Promise<WorksheetLocation[]> {
  const worksheetFolders = collectWorksheetFolders(courses);
  const worksheets: WorksheetLocation[] = [];

  for (const folder of worksheetFolders) {
    const locations = await expandWorksheetFolder(folder);
    worksheets.push(...locations);
  }

  return worksheets;
}

function collectWorksheetFolders(courses: ResolvedCourse[]): WorksheetFolder[] {
  return courses.flatMap((course) => {
    const { group, slug, subject, worksheetFormat, topics } = course;

    return topics
      .filter((topic) => isActiveStatus(topic.status))
      .flatMap((topic) =>
        topic.chapters
          .filter((chapter) => isActiveStatus(chapter.status))
          .map((chapter) => {
            const hasMultiChapter = topic.chapters.length > 1;
            const baseDir = buildBaseDir(subject.id, topic.topic, hasMultiChapter);
            const targetDir = buildTargetDir({
              isWeb: worksheetFormat === "web",
              subjectId: subject.id,
              groupId: group.id,
              slug,
              topicId: topic.topic,
              hasMultiChapter,
            });

            return {
              sourceDir: `${baseDir}/${chapter.chapter}/worksheets`,
              targetBase: `${targetDir}/${chapter.slug}`,
              process: selectWorksheetProcess(chapter.status, worksheetFormat),
              worksheetsRef: chapter.worksheets,
            };
          }),
      );
  });
}

function buildBaseDir(subjectId: string, topicId: string, hasMultiChapter: boolean): string {
  const parts = ["base", subjectId];
  if (hasMultiChapter) {
    parts.push(topicId, "chapters");
  }
  return parts.join("/");
}

function buildTargetDir(params: {
  isWeb: boolean;
  subjectId: string;
  groupId: string;
  slug: string;
  topicId: string;
  hasMultiChapter: boolean;
}): string {
  const targetParts = params.isWeb
    ? ["resources", params.groupId, params.slug]
    : ["worksheets", params.subjectId];

  if (params.hasMultiChapter) {
    targetParts.push(params.topicId);
  }

  return targetParts.join("/");
}

async function expandWorksheetFolder(folder: WorksheetFolder): Promise<WorksheetLocation[]> {
  const { sourceDir, targetBase, process, worksheetsRef } = folder;
  const locations: WorksheetLocation[] = [];
  let index = 1;

  for await (const relPath of globContent(`${sourceDir}/*.typ`)) {
    const targetPath = buildTargetPath(targetBase, index++);
    const label = await getLabel(relPath);

    const refs = buildWorksheetRefs(process, targetPath, label);
    worksheetsRef.push(...refs);

    locations.push({
      source: relPath,
      target: targetPath,
      process,
    });
  }

  return locations;
}

function buildTargetPath(targetBase: string, index: number): string {
  const suffix = String(index).padStart(2, "0");
  return `${targetBase}_${suffix}`;
}

function buildWorksheetRefs(
  process: WorksheetProcess,
  targetPath: string,
  label: string,
): WorksheetRef[] {
  if (process === "web") {
    return [{ href: targetPath.slice("resources/".length), label, process }];
  }

  if (process === "pdf") {
    return [{ href: `${targetPath}.pdf`, label, process }];
  }

  return [
    { href: `${targetPath}.pdf`, label, process: "pdf" },
    { href: `${targetPath}-Loesung.pdf`, label, process },
  ];
}

function selectWorksheetProcess(status: Status, format: WorksheetFormat): WorksheetProcess {
  if (format === "web") {
    return "web";
  }
  if (status === "current") {
    return "pdf";
  }
  return "pdfSolution";
}

function isActiveStatus(status: Status): boolean {
  return status === "finished" || status === "current";
}

async function getLabel(relPath: string): Promise<string> {
  const content = await readContentFile(relPath);
  const protectedBlocks = protectCodeBlocks(content);

  return extractTitle(protectedBlocks.safeContent, protectedBlocks);
}
