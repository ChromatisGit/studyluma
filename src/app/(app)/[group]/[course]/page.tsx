
import { getCourseId } from "@data/courses";
import { getCourseRoadmap } from "@data/roadmap";
import { CoursepagePage } from "@features/coursepage/Coursepage";
import type { CoursepageModel } from "@domain/roadmap";

type PageParams = {
  params: {
    groupKey: string;
    subjectKey: string;
  };
};


export default async function CourseRoute({ params }: PageParams) {
  const { groupKey, subjectKey } = params;
  const course = getCourseId(groupKey, subjectKey);

  const roadmap = getCourseRoadmap(courseId);

  const model: CoursepageModel = {
    title: getCourseTitle(course),
    label: getCourseLabel(course),
    slug: course.slug,
    group: groupKey,
    current: null,
    roadmap,
  };

  return <CoursepagePage model={model} />;
}
