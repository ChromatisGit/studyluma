import { notFound } from "next/navigation";

import { assertCanAccessPage, getSession } from "@services/authService";
import { getCourseId, coursePublic } from "@services/courseService";
import { getPracticeTasks } from "@services/practiceService";
import { getProgressDTO } from "@services/courseService";
import { Practise } from "@features/practise/Practise";

type PageParams = {
  params: Promise<{
    group: string;
    course: string;
    topic: string;
  }>;
};

export default async function PracticePage({ params }: PageParams) {
  const { group: groupKey, course: subjectKey, topic: topicId } = await params;

  const session = await getSession();
  const user = session?.user ?? null;
  const courseId = await getCourseId(groupKey, subjectKey);
  const isPublic = await coursePublic(courseId);
  assertCanAccessPage(session, groupKey, isPublic, courseId);

  const progress = await getProgressDTO(courseId, user);

  const topic = progress.topics.find((item) => item.topicId === topicId);
  if (!topic) notFound();

  const tasks = getPracticeTasks(courseId);

  return <Practise courseId={courseId} topicTitle={topic.label} tasks={tasks} />;
}

