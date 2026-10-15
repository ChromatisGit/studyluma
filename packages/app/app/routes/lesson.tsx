import type { LoaderFunctionArgs, MetaArgs } from "react-router";
import { redirect, useLoaderData, useLocation, useParams } from "react-router";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import { loadSite } from "../site.server";
import {
  chapterPath,
  chapterPathById,
  chaptersInOrder,
  courseOverviewPath,
  findChapterBySlug,
} from "../../src/modules/courses";
import {
  buildDeck,
  presentationFor,
  TeacherView,
} from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/classroom";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterSlug = "", courseId = "" } = params;
  if ((await readViewer(request)) !== "teacher") {
    throw redirect(chapterPath(courseId, chapterSlug));
  }
  const site = await loadSite(request);
  const course = site.courses.find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  if (!course || !chapterId) {
    throw new Response(null, { status: 404 });
  }
  const url = new URL(request.url);
  const catalog = getCatalog();
  const presentation = presentationFor(
    catalog,
    chapterId,
    url.searchParams.get("presentation"),
  );
  const deck = presentation && buildDeck(catalog, presentation.id);
  if (!deck?.slides.length) {
    throw new Response(null, { status: 404 });
  }
  // The decks of the course's chapters a unit can visit besides the main one.
  const chapters = new Map(
    chaptersInOrder(course).map((chapter) => [chapter.id, chapter]),
  );
  const visitable = catalog.presentations.filter(
    (item) =>
      chapters.has(item.chapterId) &&
      catalog.foliensaetze.find((set) => set.id === item.rootFoliensatzId)
        ?.inOverview,
  );
  const mainId = url.searchParams.get("main");
  const main =
    mainId && mainId !== deck.id && visitable.some((item) => item.id === mainId)
      ? buildDeck(catalog, mainId)
      : null;
  return {
    deck,
    mainDeck: main?.slides.length ? main : deck,
    periods: catalog.timetable.periods,
    initialFrameId: url.searchParams.get("start") ?? undefined,
    targets: visitable
      .filter((item) => item.id !== deck.id)
      .map((item) => ({
        id: item.id,
        title: `${chapters.get(item.chapterId)?.title ?? ""}: ${item.title}`,
        path: `${chapterPathById(course, item.chapterId)}/lesson?presentation=${encodeURIComponent(item.id)}`,
      })),
  };
}

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.deck.title }] : [];
}

export default function LessonRoute() {
  const { deck, mainDeck, periods, initialFrameId, targets } =
    useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  const { search } = useLocation();
  const chapter = chapterPath(courseId, chapterSlug);
  return (
    <TeacherView
      courseId={courseId}
      deck={deck}
      mainDeck={mainDeck}
      periods={periods}
      targets={targets}
      lessonPath={`${chapter}/lesson${search}`}
      projectorPath={`${chapter}/lesson/projector?presentation=${encodeURIComponent(deck.id)}`}
      chapterPath={chapter}
      overviewPath={courseOverviewPath(courseId)}
      initialFrameId={initialFrameId}
    />
  );
}
