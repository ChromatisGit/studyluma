
import { getCourseId } from "@services/courseService";
import { getCourseDTO } from "@services/getCourseDTO";
import { getProgressDTO } from "@services/getProgressDTO";
import { CoursepagePage } from "@features/coursepage/Coursepage";

type PageParams = {
  params: Promise<{
    group: string;
    course: string;
  }>;
};


export default async function CourseRoute({ params }: PageParams) {
  const { group: groupKey, course: subjectKey } = await params;
  const courseId = getCourseId(groupKey, subjectKey);
  const course = getCourseDTO(courseId);
  const progress = await getProgressDTO(courseId);

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

