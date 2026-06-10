import { useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertCanAccessPage } from "@core/auth/guards";
import {
  coursePublic,
  getCourseId,
  getProgressDTO,
  getSubject,
  getWorksheetRefs,
} from "@services/courseService";
import { getPage } from "@services/pageService";
import { ContentPageRenderer } from "@ui/ContentPageRenderer";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { group?: string; course?: string; topic?: string; chapter?: string };
}) {
  const { group: groupKey, course: subjectKey, topic: topicId, chapter: chapterId } = params;
  if (!groupKey || !subjectKey || !topicId || !chapterId) {
    throw new Response("Not found", { status: 404 });
  }

  const session = await getSession(request);
  const user = session?.user ?? null;
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);

  const progress = await getProgressDTO(courseId, user);
  const topic = progress.topics.find((t) => t.topicId === topicId);
  const chapter = topic?.chapters.find((c) => c.chapterId === chapterId);
  if (!chapter || chapter.status === "locked") throw new Response("Not found", { status: 404 });

  const subject = await getSubject(courseId);
  const [page, worksheets] = await Promise.all([
    getPage({ subject: subject.id, topicId, chapterId }),
    getWorksheetRefs({ courseId, topicId, chapterId, user }),
  ]);
  return { page, worksheets };
}

export default function Chapter() {
  const { page, worksheets } = useLoaderData<typeof loader>();
  return (
    <ContentPageRenderer
      title={page.title}
      content={page.content}
      worksheets={worksheets ?? undefined}
    />
  );
}
