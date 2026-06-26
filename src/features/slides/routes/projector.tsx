import { useLoaderData } from "react-router";
import { getSession } from "@core/auth/session.server";
import { assertAdminAccess } from "@core/auth/guards";
import { getSubject } from "@services/courseService";
import { getSlideDeck } from "@services/slideService";
import { SlideProjector } from "@features/slides/SlideProjector";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { courseId?: string; topic?: string; chapter?: string; slideId?: string };
}) {
  const { courseId, topic: topicId, chapter: chapterId, slideId } = params;
  if (!courseId || !topicId || !chapterId || !slideId) {
    throw new Response("Not found", { status: 404 });
  }
  const session = await getSession(request);
  assertAdminAccess(session);
  const { id: subject } = await getSubject(courseId);
  const deck = await getSlideDeck({ subject, topicId, chapterId, slideId });
  return { deck, courseId };
}

export default function Projector() {
  const data = useLoaderData<typeof loader>();
  return <SlideProjector {...data} />;
}
