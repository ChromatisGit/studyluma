
import { getCourseId } from "@services/courseService";
import { getCourseDTO, getProgressDTO } from "@services/courseService";
import { getSession } from "@services/authService";
import { CoursepagePage } from "@features/coursepage/Coursepage";

type PageParams = {
  params: Promise<{
    group: string;
    course: string;
  }>;
};


export default async function CourseRoute({ params }: PageParams) {
  const { group: groupKey, course: subjectKey } = await params;
  const session = await getSession();
  const user = session?.user ?? null;
  const courseId = await getCourseId(groupKey, subjectKey);
  const [course, progress] = await Promise.all([
    getCourseDTO(courseId),
    getProgressDTO(courseId, user),
  ]);

  const currentTopic = progress.topics.find(
    (topic) => topic.topicId === progress.currentTopicId
  );

  const model = {
    title: course.label,
    label: course.label,
    current: currentTopic?.label ?? null,
    roadmap: progress.topics,
  };

  return <CoursepagePage model={model} />;
}

