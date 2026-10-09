import type { LoaderFunctionArgs } from "react-router";
import { loadSite } from "../site.server";
import { sheetsFor } from "../../src/modules/courses";
import { readViewer } from "../../src/modules/classroom";
export { default } from "../StudyShellLayout";

export async function loader({ request, params }: LoaderFunctionArgs) {
  const viewer = readViewer(request);
  const site = await loadSite(request);
  const courseId = params.courseId ?? "";
  const configuredCourse = courseId
    ? site.courses.find((course) => course.id === courseId)
    : undefined;
  const chapterId =
    params.chapterId ?? configuredCourse?.currentChapterId ?? undefined;
  return {
    viewer,
    sidebarChapterId: chapterId ?? null,
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
