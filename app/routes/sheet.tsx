import { useLoaderData, useParams } from "react-router";
import { findChapter, getCourse } from "../../src/modules/courses";
import { readViewer } from "../../src/modules/viewer";
import {
  getWorksheetChapter,
  WorksheetChapter,
} from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";
import type { Route } from "./+types/sheet";

export function loader({ params, request }: Route.LoaderArgs) {
  const course = getCourse(params.courseId);
  const viewer = readViewer(request);
  const chapter = getWorksheetChapter(params.chapterId, viewer);
  if (!course || !findChapter(course, params.chapterId) || !chapter) {
    throw new Response(null, { status: 404 });
  }
  if (!chapter.sheets.some((sheet) => sheet.id === params.sheetId)) {
    throw new Response(null, { status: 404 });
  }
  return { chapter, viewer, title: `${chapter.number} ${chapter.title}` };
}

export function meta({ data }: Route.MetaArgs) {
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
