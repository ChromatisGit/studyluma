import { getSlideDeck } from "@services/slideService";
import { getSubject } from "@services/courseService";
import { SlideProjector } from "@features/slides/SlideProjector";
import type { CourseId } from "@schema/courseTypes";

type PageParams = {
  params: Promise<{
    courseId: string;
    topic: string;
    chapter: string;
    slideId: string;
  }>;
};

export default async function ProjectorPage({ params }: PageParams) {
  const {
    courseId,
    topic: topicId,
    chapter: chapterId,
    slideId,
  } = await params;

  const { id: subject } = await getSubject(courseId as CourseId);

  const deck = await getSlideDeck({
    subject,
    topicId,
    chapterId,
    slideId,
  });

  const channelName = `studynode-slides-${slideId}`;

  return <SlideProjector deck={deck} channelName={channelName} />;
}
