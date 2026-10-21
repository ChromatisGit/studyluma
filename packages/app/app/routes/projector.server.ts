import type { DataArgs } from "@chromatis/base/data";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import { buildDeck, presentationFor } from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/classroom";
import { findChapterBySlug } from "../../src/modules/courses";
import { loadCourses } from "../site.server";

export async function loader({ params, request }: DataArgs) {
  const { chapterSlug = "", courseId = "" } = params;
  if ((await readViewer(request)) !== "teacher") {
    throw new Response(null, { status: 403 });
  }
  const course = loadCourses(request).find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  if (!chapterId) {
    throw new Response(null, { status: 404 });
  }
  const catalog = getCatalog();
  const presentation = presentationFor(
    catalog,
    chapterId,
    new URL(request.url).searchParams.get("presentation"),
  );
  const deck = presentation && buildDeck(catalog, presentation.id);
  if (!deck) {
    throw new Response(null, { status: 404 });
  }
  return { deck };
}
