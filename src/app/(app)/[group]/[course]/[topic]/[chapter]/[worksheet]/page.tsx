import { WorksheetRenderer } from "@features/contentpage/renderers/WorksheetRenderer";
import { getPage } from "@services/pageService";
import { getSession, assertCanAccessPage } from "@services/authService";
import { getCourseId, getSubject, coursePublic } from "@services/courseService";
import { getProgressDTO } from "@services/courseService";

type PageParams = {
  params: Promise<{
    group: string;
    course: string;
    topic: string;
    chapter: string;
    worksheet: string;
  }>;
};

export default async function WorksheetRoute({ params }: PageParams) {
  const {
    group: groupKey,
    course: subjectKey,
    topic: topicId,
    chapter: chapterId,
    worksheet: worksheetId,
  } = await params;

  const session = await getSession();
  const user = session?.user ?? null;
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);

  const subject = await getSubject(courseId);
  const page = await getPage({subject: subject.id, topicId, chapterId, worksheetId});

  const progressDTO = await getProgressDTO(courseId, user);
  const topic = progressDTO.topics.find(t => t.topicId === topicId);
  const chapter = topic?.chapters.find(c => c.chapterId === chapterId);
  const chapterStatus = chapter?.status ?? 'finished';

  const userId = session?.user?.id;

  return <WorksheetRenderer page={page} worksheetSlug={`${courseId}-${topicId}-${chapterId}-${worksheetId}`} chapterStatus={chapterStatus} userId={userId} courseId={courseId} worksheetId={worksheetId} />;
}

