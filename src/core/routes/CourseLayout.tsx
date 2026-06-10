import { Outlet, useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { assertCanAccessPage } from "@core/auth/guards";
import { coursePublic, getCourseDTO, getCourseId } from "@services/courseService";

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
  const course = await getCourseDTO(courseId);

  return { courseId, course, user: session?.user ?? null };
}

export default function CourseLayout() {
  useLoaderData<typeof loader>();
  return <Outlet />;
}
