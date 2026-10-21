import { useEffect } from "react";
import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { loadSheets, loadSite } from "../site.server";
import { findChapterBySlug } from "../../src/modules/courses";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

/**
 * A worksheet inside the lesson: the teacher's stage and the projector each
 * show it in a frame. It is the sheet the class sees, without the shell.
 */
export async function loader({ params, request }: LoaderFunctionArgs) {
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

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.title }] : [];
}

export default function LessonSheetRoute() {
  const { chapter, sheetId, viewer } = useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  // The projector has no dark mode; this page lives only inside a lesson frame.
  useEffect(() => {
    document.documentElement.dataset.theme = "light";
  }, []);
  return (
    <WorksheetChapter
      chapter={chapter}
      viewer={viewer}
      view={{ kind: "sheet", sheetId }}
      links={worksheetLinks(courseId, chapterSlug)}
      embed
    />
  );
}
