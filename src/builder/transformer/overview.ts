import path from "node:path";
import { renderOverview } from "@builder/template/overview.mdx";
import type { OverviewModel, RoadmapChapter, RoadmapTopic } from "@schema/overview";
import type { ResolvedCourseTopic, ResolvedCourse } from "../prepareCourses";

export function buildOverview(
  course: ResolvedCourse,
  groupCourses: ResolvedCourse[],
) {
  const model = toOverviewModel(course, groupCourses);

  return {
    relativePath: path.join("docs", course.group.id, course.slug, "index.mdx"),
    content: renderOverview(model),
  };
}

function toOverviewModel(
  course: ResolvedCourse,
  allCourses: ResolvedCourse[],
): OverviewModel {
  const { group, subject, slug, courseVariant, topics, currentChapter } = course;

  const hasMultipleSameSubject = allCourses.some(
    c => c.group.id === group.id && c.subject.id === subject.id && c.slug !== slug
  );

  const label = hasMultipleSameSubject && courseVariant?.short
    ? `${subject.label} (${courseVariant.short})`
    : subject.label;

  const title = `${subject.label} ${group.id.toUpperCase()}`;

  const roadmap: RoadmapTopic[] = topics.map((topic) =>
    buildRoadmapTopic(topic, group.id, slug),
  );

  return {
    title,
    label,
    group: group.id,
    subject: subject.id,
    current: currentChapter?.label ?? undefined,
    roadmap,
    worksheets: currentChapter?.worksheets ?? [],
  };
}

function buildRoadmapTopic(
  topic: ResolvedCourseTopic,
  group: string,
  slug: string,
): RoadmapTopic {
  const topicLink = ["", group, slug, topic.topic].join("/");
  const chapters: RoadmapChapter[] = topic.chapters.map((chapter) => {
    return {
      label: chapter.label,
      link: [topicLink, chapter.slug].join("/"),
      status: chapter.status,
    }
  });

  return {
    label: topic.label,
    status: topic.status,
    link: topicLink,
    chapters
  };
}
