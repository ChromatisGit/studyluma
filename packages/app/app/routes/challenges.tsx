import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { loadSite } from "../site.server";
import { sheetsFor } from "../../src/modules/courses";
import { WorksheetChapter } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const site = await loadSite(request);
  const chapter = sheetsFor(site, courseId, chapterId);
  if (!chapter) {
    throw new Response(null, { status: 404 });
  }
  return { chapter, viewer: site.viewer };
}

export default function ChallengesRoute() {
  const { chapter, viewer } = useLoaderData<typeof loader>();
  const { courseId = "", chapterId = "" } = useParams();
  return (
    <WorksheetChapter
      chapter={chapter}
      viewer={viewer}
      view={{ kind: "challenges" }}
      links={worksheetLinks(courseId, chapterId)}
    />
  );
}
