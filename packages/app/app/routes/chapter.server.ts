import type { DataArgs } from "@chromatis/base/data";
import { findChapterBySlug } from "../../src/modules/courses";
import { canReadSummary } from "../../src/modules/classroom";
import { loadCatalog, loadSheets, loadSite } from "../site.server";

export async function loader({ params, request }: DataArgs) {
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
