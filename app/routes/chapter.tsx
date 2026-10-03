import { Link, useLoaderData } from "react-router";
import { Presentation } from "lucide-react";
import { buttonClassName } from "@chromatis/base/ui";
import { fill } from "../../src/helper/text";
import { getLesson, lessonText } from "../../src/modules/lessons";
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
    lessonFrames:
      viewer === "teacher"
        ? (getLesson(params.chapterId)?.frames.length ?? 0)
        : 0,
  };
}

export default function Chapter() {
  const { course, chapterId, summary, viewer, worksheets, lessonFrames } =
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
      teacherActions={
        lessonFrames > 0 && (
          <>
            <Link className={buttonClassName({})} to="lesson">
              <Presentation className="icon" aria-hidden="true" />
              {lessonText.start.open}
            </Link>
            <span className="muted">
              {fill(lessonText.start.description, { count: lessonFrames })}
            </span>
          </>
        )
      }
      homeLabel={TEXT.navigation.courses}
      homePath="/"
    />
  );
}
