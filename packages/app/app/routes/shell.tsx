import type { LoaderFunctionArgs } from "react-router";
import { loadSheets, loadSite } from "../site.server";
import { findChapter, findChapterBySlug } from "../../src/modules/courses";
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
    // The sidebar needs only the outline of the chapter's sheets.
    worksheetChapter:
      chapterId && courseId
        ? ((await loadSheets(request, courseId, chapterId, "none")) ?? null)
        : null,
    hasSummary: !!(chapterId && site.index.summaryTitles[chapterId]),
    summaryUnlocked: !!(
      chapterId && site.releasedSummaries.includes(chapterId)
    ),
  };
}
