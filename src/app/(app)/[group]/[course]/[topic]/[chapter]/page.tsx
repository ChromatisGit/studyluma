import { ContentPageRenderer } from "@features/contentpage/renderers/ContentPageRenderer";
import { assertCanAccessPage, getSession } from "@/server/auth/auth";
import { getCourseId, getSubject, getWorksheetRefs } from "@/server/data/courses";
import { getPage } from "@/server/data/getPage";
import { getProgressDTO } from "@/server/data/getProgressDTO";
import { notFound } from "next/navigation";


type PageParams = {
  params: Promise<{
    group: string;
    course: string;
    topic: string;
    chapter: string;
  }>;
};

export default async function ChapterPage({ params }: PageParams) {
  const { group: groupKey, course: subjectKey, topic: topicId, chapter: chapterId } = await params;

  const session = await getSession();
  const courseId = getCourseId(groupKey, subjectKey);
  assertCanAccessPage(session, groupKey, courseId);

  // Check if chapter is accessible based on progress
  const progressDTO = await getProgressDTO(courseId);
  const topic = progressDTO.topics.find((t) => t.topicId === topicId);
  const chapter = topic?.chapters.find((c) => c.chapterId === chapterId);

  if (!chapter || chapter.status === "locked") {
    notFound();
  }

  const subject = getSubject(courseId)
  const page = await getPage({ subject: subject.id, topicId, chapterId });
  const worksheets = await getWorksheetRefs({ courseId, topicId, chapterId });

  return (
    <ContentPageRenderer
      title={page.title}
      content={page.content}
      worksheets={worksheets || undefined}
    />
  );
}
