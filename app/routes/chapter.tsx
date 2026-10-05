import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData } from "react-router";
import {
  ChapterPage,
  getSummary,
  findChapter,
} from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";
import { getWorksheetChapter, SheetCards } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";
import TEXT from "../app.de.json";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  const viewer = "student" as const;
  if (!course || !findChapter(course, chapterId)) {
    throw new Response(null, { status: 404 });
  }
  return {
    course,
    chapterId: chapterId,
    summary: getSummary(chapterId),
    viewer,
    worksheets: getWorksheetChapter(chapterId, viewer) ?? null,
  };
}

export default function Chapter() {
  const { course, chapterId, summary, viewer, worksheets } =
    useLoaderData<typeof loader>();
  return (
    <ChapterPage
      course={course}
      chapterId={chapterId}
      summary={summary}
      worksheets={
        worksheets && (
          <SheetCards
            chapter={worksheets}
            viewer={viewer}
            links={worksheetLinks(course.id, chapterId)}
          />
        )
      }
      homeLabel={TEXT.navigation.courses}
      homePath="/courses"
    />
  );
}
