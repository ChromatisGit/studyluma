import { Outlet, useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertCanAccessPage } from "@core/auth/guards";
import { coursePublic, getCourseDTO, getCourseId, getProgressDTO } from "@services/courseService";

export async function loader({
  request,
  params,
}: {
  request: Request;
  params: { group?: string; course?: string };
}) {
  const groupKey = params.group;
  const subjectKey = params.course;
  if (!groupKey || !subjectKey) throw new Response("Not found", { status: 404 });

  const session = await getSession(request);
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);

  const user = session?.user ?? null;
  const [course, progress] = await Promise.all([
    getCourseDTO(courseId),
    getProgressDTO(courseId, user),
  ]);

  return { courseId, course, progress, user };
}

export default function CourseLayout() {
  useLoaderData<typeof loader>();
  return <Outlet />;
}
