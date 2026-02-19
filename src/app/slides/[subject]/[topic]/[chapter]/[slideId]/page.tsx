import { getSlideDeck } from "@services/slideService";
import { SlidePresenter } from "@features/slides/SlidePresenter";

type PageParams = {
  params: Promise<{
    subject: string;
    topic: string;
    chapter: string;
    slideId: string;
  }>;
};

export default async function PresenterPage({ params }: PageParams) {
  const {
    subject,
    topic: topicId,
    chapter: chapterId,
    slideId,
  } = await params;

  const deck = await getSlideDeck({
    subject,
    topicId,
    chapterId,
    slideId,
  });

  const channelName = `studynode-slides-${slideId}`;
  const projectorPath = `/slides/${subject}/${topicId}/${chapterId}/${slideId}/projector`;

  return (
    <SlidePresenter
      deck={deck}
      channelName={channelName}
      projectorPath={projectorPath}
    />
  );
}
