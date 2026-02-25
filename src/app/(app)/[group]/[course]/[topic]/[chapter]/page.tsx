import { ContentPageRenderer } from "@features/contentpage/renderers/ContentPageRenderer";
import { assertCanAccessPage, getSession } from "@services/authService";
import { getCourseId, getSubject, getWorksheetRefs, coursePublic } from "@services/courseService";
import { getPage } from "@services/pageService";
import { getProgressDTO } from "@services/courseService";
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
  const user = session?.user ?? null;
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);

  // Check if chapter is accessible based on progress
  const progressDTO = await getProgressDTO(courseId, user);
  const topic = progressDTO.topics.find((t) => t.topicId === topicId);
  const chapter = topic?.chapters.find((c) => c.chapterId === chapterId);

  if (!chapter || chapter.status === "locked") {
    notFound();
  }

  const subject = await getSubject(courseId);
  const page = await getPage({ subject: subject.id, topicId, chapterId });
  const worksheets = await getWorksheetRefs({ courseId, topicId, chapterId, user });

  return (
    <ContentPageRenderer
      title={page.title}
      content={page.content}
      worksheets={worksheets || undefined}
    />
  );
}

