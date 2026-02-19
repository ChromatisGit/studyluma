import { WorksheetRenderer } from "@features/contentpage/renderers/WorksheetRenderer";
import { getPage } from "@services/pageService";
import { getSession, assertCanAccessPage } from "@services/authService";
import { getCourseId, getSubject } from "@services/courseService";
import { getProgressDTO } from "@services/getProgressDTO";

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
  const courseId = getCourseId(groupKey, subjectKey);
  assertCanAccessPage(session, groupKey, courseId);

  const subject = getSubject(courseId)
  const page = await getPage({subject: subject.id, topicId, chapterId, worksheetId});

  const progressDTO = await getProgressDTO(courseId);
  const topic = progressDTO.topics.find(t => t.topicId === topicId);
  const chapter = topic?.chapters.find(c => c.chapterId === chapterId);
  const chapterStatus = chapter?.status ?? 'finished';

  return <WorksheetRenderer page={page} worksheetSlug={`${courseId}-${topicId}-${chapterId}-${worksheetId}`} chapterStatus={chapterStatus} />;
}

