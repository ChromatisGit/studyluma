import { useLoaderData } from "react-router";
import { getSession } from "@core/index.server";
import { getCourseDTO, getCourseId, getProgressDTO } from "@services/courseService";
import { CoursepagePage } from "@features/course/Coursepage";

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
  const [course, progress] = await Promise.all([
    getCourseDTO(courseId),
    getProgressDTO(courseId, session?.user ?? null),
  ]);
  return {
    model: {
      label: course.label,
      description: course.description,
      courseId,
      roadmap: progress.topics,
    },
  };
}

export default function Course() {
  const { model } = useLoaderData<typeof loader>();
  return <CoursepagePage model={model} />;
}
