import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { findChapter } from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";
import {
  getWorksheetChapter,
  WorksheetChapter,
} from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "", sheetId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  const viewer = "student" as const;
  const chapter = getWorksheetChapter(chapterId, viewer);
  if (!course || !findChapter(course, chapterId) || !chapter) {
    throw new Response(null, { status: 404 });
  }
  if (!chapter.sheets.some((sheet) => sheet.id === sheetId)) {
    throw new Response(null, { status: 404 });
  }
  return { chapter, viewer, title: `${chapter.number} ${chapter.title}` };
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
