import type { LoaderFunctionArgs } from "react-router";
import { useLoaderData, useParams } from "react-router";
import { getCatalog } from "../../src/modules/catalog/server/catalog.server";
import {
  buildDeck,
  lessonText,
  presentationFor,
  ProjectorView,
} from "../../src/modules/lessons";
import { readViewer } from "../../src/modules/classroom";
import { chapterPath, findChapterBySlug } from "../../src/modules/courses";
import { loadCourses } from "../site.server";

export async function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterSlug = "", courseId = "" } = params;
  if ((await readViewer(request)) !== "teacher") {
    throw new Response(null, { status: 403 });
  }
  const course = loadCourses(request).find((item) => item.id === courseId);
  const chapterId = course && findChapterBySlug(course, chapterSlug)?.id;
  if (!chapterId) {
    throw new Response(null, { status: 404 });
  }
  const catalog = getCatalog();
  const presentation = presentationFor(
    catalog,
    chapterId,
    new URL(request.url).searchParams.get("presentation"),
  );
  const deck = presentation && buildDeck(catalog, presentation.id);
  if (!deck) {
    throw new Response(null, { status: 404 });
  }
  return { deck };
}

export function meta() {
  return [{ title: lessonText.projector.title }];
}

export default function ProjectorRoute() {
  const { deck } = useLoaderData<typeof loader>();
  const { courseId = "", chapterSlug = "" } = useParams();
  return (
    <ProjectorView
      courseId={courseId}
      deck={deck}
      chapterPath={chapterPath(courseId, chapterSlug)}
    />
  );
}
