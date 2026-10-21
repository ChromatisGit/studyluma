import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { loadSheets, loadSite } from "../site.server";
import { findChapterBySlug } from "../../src/modules/courses";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterSlug = "", courseId = "" } = params;
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  const chapter = chapterId
    ? await loadSheets(request, courseId, chapterId, "challenges")
    : undefined;
  if (!chapter) {
    throw new Response(null, { status: 404 });
  }
  return { chapter, viewer: site.viewer };
}

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
