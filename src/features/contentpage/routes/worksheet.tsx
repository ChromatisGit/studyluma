import { useLoaderData } from "react-router";
import { getSession } from "@platform/index.server";
import { assertCanAccessPage, assertLoggedIn } from "@platform/auth/guards";
import { coursePublic, getCourseId, getProgressDTO, getSubject } from "@services/courseService";
import { getPage } from "@services/pageService";
import { loadWorksheetData } from "@services/worksheetService";
import { WorksheetRenderer } from "@features/contentpage/renderers/WorksheetRenderer";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: {
    group?: string;
    course?: string;
    topic?: string;
    chapter?: string;
    worksheet?: string;
  };
}) {
  const {
    group: groupKey,
    course: subjectKey,
    topic: topicId,
    chapter: chapterId,
    worksheet: worksheetId,
  } = params;
  if (!groupKey || !subjectKey || !topicId || !chapterId || !worksheetId) {
    throw new Response("Not found", { status: 404 });
  }

  const session = await getSession(request);
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);
  assertLoggedIn(session);

  const subject = await getSubject(courseId);
  const [page, progress, worksheetData] = await Promise.all([
    getPage({ subject: subject.id, topicId, chapterId, worksheetId }),
    getProgressDTO(courseId, session.user),
    loadWorksheetData(worksheetId, session.user),
  ]);
  const topic = progress.topics.find((t) => t.topicId === topicId);
  const chapter = topic?.chapters.find((c) => c.chapterId === chapterId);
  const chapterStatus = chapter?.status ?? "finished";

  return {
    page,
    worksheetSlug: `${courseId}-${topicId}-${chapterId}-${worksheetId}`,
    chapterStatus,
    userId: session.user.id,
    courseId,
    worksheetId,
    savedResponses: worksheetData.taskResponses,
    submittedSections: worksheetData.submittedSections,
  };
}

export default function Worksheet() {
  const data = useLoaderData<typeof loader>();
  return <WorksheetRenderer {...data} />;
}
