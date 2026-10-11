import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { redirect, useLoaderData, useParams } from "react-router";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import { loadSite } from "../site.server";
import { chapterPath, findChapter } from "../../src/modules/courses";
import {
  buildDeck,
  presentationFor,
  TeacherView,
} from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/classroom";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "", courseId = "" } = params;
  if (readViewer(request) !== "teacher") {
    throw redirect(chapterPath(courseId, chapterId));
  }
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  const url = new URL(request.url);
  const catalog = getCatalog();
  const presentation = presentationFor(
    catalog,
    chapterId,
    url.searchParams.get("presentation"),
  );
  const deck = presentation && buildDeck(catalog, presentation.id);
  if (!course || !findChapter(course, chapterId) || !deck?.slides.length) {
    throw new Response(null, { status: 404 });
  }
  return {
    deck,
    periods: catalog.timetable.periods,
    initialFrameId: url.searchParams.get("start") ?? undefined,
  };
}

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.deck.title }] : [];
}

export default function LessonRoute() {
  const { deck, periods, initialFrameId } = useLoaderData<typeof loader>();
  const { courseId = "", chapterId = "" } = useParams();
  const chapter = chapterPath(courseId, chapterId);
  return (
    <TeacherView
      courseId={courseId}
      deck={deck}
      periods={periods}
      projectorPath={`${chapter}/lesson/projector?presentation=${encodeURIComponent(deck.id)}`}
      chapterPath={chapter}
      initialFrameId={initialFrameId}
    />
  );
}
