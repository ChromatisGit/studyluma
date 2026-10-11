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

export function loader({ params, request }: LoaderFunctionArgs) {
  const { chapterId = "" } = params;
  if (readViewer(request) !== "teacher") {
    throw new Response(null, { status: 403 });
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
  const { courseId = "" } = useParams();
  return <ProjectorView courseId={courseId} deck={deck} />;
}
