import { useLoaderData } from "react-router";
import {
  ChapterPage,
  getCourse,
  getSummary,
  findChapter,
} from "../../src/modules/courses";
import { readViewer } from "../../src/modules/viewer";
import { getWorksheetChapter, SheetCards } from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";
import TEXT from "../app.de.json";
import type { Route } from "./+types/chapter";

export function loader({ params, request }: Route.LoaderArgs) {
  const course = getCourse(params.courseId);
  const viewer = readViewer(request);
  if (!course || !findChapter(course, params.chapterId)) {
    throw new Response(null, { status: 404 });
  }
  return {
    course,
    chapterId: params.chapterId,
    summary: getSummary(params.chapterId),
    viewer,
    worksheets: getWorksheetChapter(params.chapterId, viewer) ?? null,
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
      homePath="/"
    />
  );
}
