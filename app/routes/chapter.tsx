import { useLoaderData } from "react-router";
import {
  ChapterPage,
  getCourse,
  getSummary,
  findChapter,
} from "../../src/modules/courses";
import { readViewer } from "../../src/modules/viewer";
import TEXT from "../app.de.json";
import type { Route } from "./+types/chapter";

export function loader({ params, request }: Route.LoaderArgs) {
  const course = getCourse(params.courseId);
  if (!course || !findChapter(course, params.chapterId)) {
    throw new Response(null, { status: 404 });
  }
  return {
    course,
    chapterId: params.chapterId,
    summary: getSummary(params.chapterId),
    viewer: readViewer(request),
  };
}

export default function Chapter() {
  const { course, chapterId, summary } = useLoaderData<typeof loader>();
  return (
    <ChapterPage
      course={course}
      chapterId={chapterId}
      summary={summary}
      homeLabel={TEXT.navigation.courses}
      homePath="/"
    />
  );
}
