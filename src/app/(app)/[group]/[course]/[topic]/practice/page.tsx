import { notFound } from "next/navigation";

import { buildCourseId } from "@data/courses";
import { getCourseOverview } from "@data/overview";
import { getPracticeTasks } from "@data/practice";
import { Practise } from "@features/practise/Practise";

type PageParams = {
  params:
    | {
        group: string;
        course: string;
        topic: string;
      }
    | Promise<{
        group: string;
        course: string;
        topic: string;
      }>;
};

export default async function PracticePage({ params }: PageParams) {
  const { group: groupKey, course: subjectKey, topic: topicId } = await params;
  const courseId = buildCourseId(groupKey, subjectKey);
  const overview = getCourseOverview(courseId);
  if (!overview) return notFound();

  const topic = overview.topics.find((item) => item.id === topicId);
  if (!topic) return notFound();

  const tasks = getPracticeTasks(courseId);

  return <Practise courseId={courseId} topicTitle={topic.title} tasks={tasks} />;
}
