import path from "node:path";
import { renderSidebar } from "@builder/template/sidebar";
import type { ResolvedCourse } from "../prepareCourses";

export function buildSidebar(course: ResolvedCourse) {

  const filteredTopics = course.topics
    .filter((topic) => topic.status !== "locked" && topic.chapters.length > 1);

  return {
    relativePath: path.join("sidebars", course.group.id, `${course.slug}.ts`),
    content: renderSidebar(filteredTopics),
  };
}
