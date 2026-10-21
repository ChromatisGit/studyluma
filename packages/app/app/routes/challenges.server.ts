import type { DataArgs } from "@chromatis/base/data";
import { loadSheets, loadSite } from "../site.server";
import { findChapterBySlug } from "../../src/modules/courses";

export async function loader({ params, request }: DataArgs) {
  const { chapterSlug = "", courseId = "" } = params;
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  const chapter = chapterId
    ? await loadSheets(request, courseId, chapterId, "challenges")
    : undefined;
  if (!chapter) {
    throw new Response(null, { status: 404 });
  }
  return { chapter, viewer: site.viewer };
}
