import type { DataArgs } from "@chromatis/base/data";
import { loadSheets, loadSite } from "../site.server";
import { findChapterBySlug } from "../../src/modules/courses";

/**
 * A worksheet inside the lesson: the teacher's stage and the projector each
 * show it in a frame. It is the sheet the class sees, without the shell.
 */
export async function loader({ params, request }: DataArgs) {
  const { chapterSlug = "", courseId = "", sheetSlug = "" } = params;
  const site = await loadSite(request);
  if (site.viewer !== "teacher") {
    throw new Response(null, { status: 403 });
  }
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
    title: sheet.title,
  };
}
