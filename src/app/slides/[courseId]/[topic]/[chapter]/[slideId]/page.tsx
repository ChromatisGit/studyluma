import { getSlideDeck } from "@services/slideService";
import { getSubject } from "@services/courseService";
import { SlidePresenter } from "@features/slides/SlidePresenter";
import type { CourseId } from "@schema/courseTypes";

type PageParams = {
  params: Promise<{
    courseId: string;
    topic: string;
    chapter: string;
    slideId: string;
  }>;
};

export default async function PresenterPage({ params }: PageParams) {
  const {
    courseId,
    topic: topicId,
    chapter: chapterId,
    slideId,
  } = await params;

  const { id: subject } = await getSubject(courseId as CourseId);

  const deck = await getSlideDeck({ subject, topicId, chapterId, slideId });

  const channelName = `studynode-slides-${slideId}`;
  const projectorPath = `/slides/${courseId}/${topicId}/${chapterId}/${slideId}/projector`;

  return (
    <SlidePresenter
      deck={deck}
      channelName={channelName}
      projectorPath={projectorPath}
      courseId={courseId}
    />
  );
}
