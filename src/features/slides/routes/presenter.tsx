import { useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertAdminAccess } from "@core/auth/guards";
import { getSubject } from "@services/courseService";
import { getSlideDeck } from "@services/slideService";
import { SlidePresenter } from "@features/slides/SlidePresenter";

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
  return {
    deck,
    courseId,
    projectorPath: `/slides/${courseId}/${topicId}/${chapterId}/${slideId}/projector`,
  };
}

export default function Presenter() {
  const data = useLoaderData<typeof loader>();
  return <SlidePresenter {...data} />;
}
