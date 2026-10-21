import { useLoaderData, useParams } from "react-router";
import type { loader } from "./challenges.server";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export default function ChallengesRoute() {
  const { chapter, viewer } = useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  return (
    <WorksheetChapter
      chapter={chapter}
      viewer={viewer}
      view={{ kind: "challenges" }}
      links={worksheetLinks(courseId, chapterSlug)}
    />
  );
}
