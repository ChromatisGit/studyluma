import { getSlideDeck } from "@services/slideService";
import { SlideProjector } from "@features/slides/SlideProjector";

type PageParams = {
  params: Promise<{
    subject: string;
    topic: string;
    chapter: string;
    slideId: string;
  }>;
};

export default async function ProjectorPage({ params }: PageParams) {
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

  return <SlideProjector deck={deck} channelName={channelName} />;
}
