import type { DataArgs } from "@chromatis/base/data";
import { loadSheets, loadSite } from "../site.server";
import { findChapterBySlug } from "../../src/modules/courses";

export async function loader({ params, request }: DataArgs) {
  const { chapterSlug = "", courseId = "", sheetSlug = "" } = params;
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  const sheetId = chapterId
    ? site.index.worksheets[chapterId]?.find((item) => item.slug === sheetSlug)
        ?.id
    : undefined;
  const chapter =
    chapterId && sheetId
      ? await loadSheets(request, courseId, chapterId, { sheetId })
      : undefined;
  const sheet = chapter?.sheets.find((item) => item.id === sheetId);
  if (!chapter || !sheet) {
    throw new Response(null, { status: 404 });
  }
  return {
    chapter,
    sheetId: sheet.id,
    viewer: site.viewer,
    title: `${chapter.number} ${chapter.title}`,
  };
}
