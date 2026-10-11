import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { loadSite } from "../site.server";
import { sheetsFor } from "../../src/modules/courses";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "", sheetId = "" } = params;
  const site = await loadSite(request);
  const chapter = sheetsFor(site, courseId, chapterId);
  if (!chapter?.sheets.some((sheet) => sheet.id === sheetId)) {
    throw new Response(null, { status: 404 });
  }
  return {
    chapter,
    viewer: site.viewer,
    title: `${chapter.number} ${chapter.title}`,
  };
}

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.title }] : [];
}

export default function SheetRoute() {
  const { chapter, viewer } = useLoaderData<typeof loader>();
  const { courseId = "", chapterId = "", sheetId = "" } = useParams();
  return (
    <WorksheetChapter
      chapter={chapter}
      viewer={viewer}
      view={{ kind: "sheet", sheetId }}
      links={worksheetLinks(courseId, chapterId)}
    />
  );
}
