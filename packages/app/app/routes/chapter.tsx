import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { ChapterPage, findChapterBySlug } from "../../src/modules/courses";
import { canReadSummary, useSite } from "../../src/modules/classroom";
import { loadCatalog, loadSheets, loadSite } from "../site.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterSlug = "", courseId = "" } = params;
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  if (!course || !chapterId) {
    throw new Response(null, { status: 404 });
  }
  const catalog = await loadCatalog(request, [chapterId]);
  return {
    course,
    chapterId,
    sheets: await loadSheets(request, courseId, chapterId, "none"),
    summary: catalog.summaries.find((item) => item.chapterId === chapterId),
    summaryVisible: canReadSummary(site, chapterId),
  };
}

export default function Chapter() {
  const { course, chapterId, sheets, summary, summaryVisible } =
    useLoaderData<typeof loader>();
  const site = useSite();
  return (
    <ChapterPage
      course={course}
      chapterId={chapterId}
      sheets={sheets}
      summary={summary}
      summaryVisible={
        site.localReleases ? canReadSummary(site, chapterId) : summaryVisible
      }
      summaryLockedForStudents={
        site.viewer === "teacher" && !site.releasedSummaries.includes(chapterId)
      }
    />
  );
}
