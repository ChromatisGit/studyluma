import { useLoaderData } from "react-router";
import { ChapterPage } from "../../src/modules/courses";
import { canReadSummary, useSite } from "../../src/modules/classroom";
import type { loader } from "./chapter.server";

export default function Chapter() {
  const { course, chapterId, sheets, summary, summaryVisible } =
    useLoaderData<typeof loader>();
  const site = useSite();
  return (
    <ChapterPage
      course={course}
      chapterId={chapterId}
      sheets={sheets}
      summary={summary}
      summaryVisible={
        site.localReleases ? canReadSummary(site, chapterId) : summaryVisible
      }
      summaryLockedForStudents={
        site.viewer === "teacher" && !site.releasedSummaries.includes(chapterId)
      }
    />
  );
}
