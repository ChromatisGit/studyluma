import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import { ChapterPage, findChapter, sheetsFor } from "../../src/modules/courses";
import { canReadSummary } from "../../src/modules/classroom";
import { loadSite } from "../site.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  if (!course || !findChapter(course, chapterId)) {
    throw new Response(null, { status: 404 });
  }
  return {
    course,
    chapterId,
    sheets: sheetsFor(site, courseId, chapterId),
    summary: site.catalog.summaries.find(
      (item) => item.chapterId === chapterId,
    ),
    summaryVisible: canReadSummary(site, chapterId),
  };
}

export default function Chapter() {
  const { course, chapterId, sheets, summary, summaryVisible } =
    useLoaderData<typeof loader>();
  return (
    <ChapterPage
      course={course}
      chapterId={chapterId}
      sheets={sheets}
      summary={summary}
      summaryVisible={summaryVisible}
    />
  );
}
