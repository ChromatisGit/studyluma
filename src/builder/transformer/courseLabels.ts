import type { CoursePlan } from "@schema/coursePlan"
import type { TopicPlan } from "@schema/topicPlan";

export function setCourseLabels(
  courses: CoursePlan[],
  topics: Record<string, TopicPlan>
) {

  return courses.map(course => ({
    ...course,

    topics: course.topics.map(t => {
      const topicDef = topics[t.topic];
      return {
        ...t,
        label: topicDef ? topicDef.title : t.label,
      };
    }),

    chapters: course.chapters.map(ch => {
      const topicDef = topics[ch.topic];
      const chapterDef = topicDef?.chapters.find(c => c.id === ch.chapter);
      return {
        ...ch,
        label: chapterDef ? chapterDef.title : ch.label,
      };
    }),

  }));
}