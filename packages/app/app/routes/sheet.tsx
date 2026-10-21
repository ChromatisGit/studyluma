import type { MetaArgs } from "@chromatis/base/client";
import { useLoaderData, useParams } from "react-router";
import type { loader } from "./sheet.server";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.title }] : [];
}

export default function SheetRoute() {
  const { chapter, sheetId, viewer } = useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  return (
    <WorksheetChapter
      chapter={chapter}
      viewer={viewer}
      view={{ kind: "sheet", sheetId }}
      links={worksheetLinks(courseId, chapterSlug)}
    />
  );
}
