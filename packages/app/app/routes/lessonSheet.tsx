import { useEffect } from "react";
import type { MetaArgs } from "@chromatis/base/client";
import { useLoaderData, useParams } from "react-router";
import type { loader } from "./lessonSheet.server";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

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
