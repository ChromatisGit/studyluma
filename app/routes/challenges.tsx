import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { findChapter } from "../../src/modules/courses";
import { getConfiguredCourse } from "../../src/modules/courses/infrastructure/coursePlan";
import {
  getWorksheetChapter,
  WorksheetChapter,
} from "../../src/modules/worksheets";
import { worksheetLinks } from "../worksheetLinks";

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  const course = getConfiguredCourse(courseId, request);
  const viewer = "student" as const;
  const chapter = getWorksheetChapter(chapterId, viewer);
  if (!course || !findChapter(course, chapterId) || !chapter) {
    throw new Response(null, { status: 404 });
  }
  return { chapter, viewer };
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
