import type { MetaArgs } from "@chromatis/base/client";
import { useLoaderData, useLocation, useParams } from "react-router";
import { CatalogContext } from "../../src/modules/catalog";
import { chapterPath, courseOverviewPath } from "../../src/modules/courses";
import { TeacherView } from "../../src/modules/lessons";
import type { loader } from "./lesson.server";

export function meta({ data }: MetaArgs<typeof loader>) {
  return data ? [{ title: data.deck.title }] : [];
}

export default function LessonRoute() {
  const { deck, mainDeck, periods, initialFrameId, targets, catalog } =
    useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  const { search } = useLocation();
  const chapter = chapterPath(courseId, chapterSlug);
  return (
    <CatalogContext.Provider value={catalog}>
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
    </CatalogContext.Provider>
  );
}
