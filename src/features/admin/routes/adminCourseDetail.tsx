import { useLoaderData } from "react-router";
import { getSession } from "@core/auth/session.server";
import { assertAdminAccess } from "@core/auth/guards";
import { getAdminWorksheetList, getCourseDTO, getProgressDTO, getSubject } from "@services/courseService";
import { listSlideDecks } from "@services/slideService";
import { AdminCourseDetail } from "@features/admin/AdminCourseDetail";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { courseId?: string };
}) {
  const courseId = params.courseId;
  if (!courseId) throw new Response("Not found", { status: 404 });
  const session = await getSession(request);
  assertAdminAccess(session);

  const [course, progress, subject] = await Promise.all([
    getCourseDTO(courseId),
    getProgressDTO(courseId, session.user),
    getSubject(courseId),
  ]);
  const [slideIds, worksheets] = await Promise.all([
    listSlideDecks({
      subject: subject.id,
      topicId: progress.currentTopicId,
      chapterId: progress.currentChapterId,
    }),
    getAdminWorksheetList(courseId, session.user),
  ]);

  return { course, progress, courseId, slideIds, worksheets };
}

export default function AdminCourseDetailRoute() {
  const data = useLoaderData<typeof loader>();
  return <AdminCourseDetail {...data} />;
}
