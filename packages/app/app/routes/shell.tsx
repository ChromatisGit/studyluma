import type { LoaderFunctionArgs } from "react-router";
import { loadSite } from "../site.server";
import {
  findChapter,
  findChapterBySlug,
  sheetsFor,
} from "../../src/modules/courses";
import { readViewer } from "../../src/modules/classroom";
import { shellSettings } from "../../src/modules/shell/server/shell.server";
export { default } from "../StudyShellLayout";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const viewer = await readViewer(request);
  const site = await loadSite(request);
  const courseId = params.courseId ?? "";
  const configuredCourse = courseId
    ? site.courses.find((course) => course.id === courseId)
    : undefined;
  const chapter =
    configuredCourse && params.chapterSlug
      ? findChapterBySlug(configuredCourse, params.chapterSlug)
      : undefined;
  const chapterId =
    chapter?.id ?? configuredCourse?.currentChapterId ?? undefined;
  const sidebarChapter = chapterId
    ? configuredCourse && findChapter(configuredCourse, chapterId)
    : undefined;
  return {
    viewer,
    shell: shellSettings(),
    sidebarChapterSlug: sidebarChapter?.slug ?? null,
    courses: site.courses.map(({ id, title }) => ({ id, title })),
    worksheetChapter:
      chapterId && courseId
        ? (sheetsFor(site, courseId, chapterId) ?? null)
        : null,
    hasSummary: !!(
      chapterId &&
      site.catalog.summaries.some((summary) => summary.chapterId === chapterId)
    ),
    summaryUnlocked: !!(
      chapterId && site.releasedSummaries.includes(chapterId)
    ),
  };
}
