import type { Status } from "@schema/overview";
import type { PageSource } from "./pages";
import path from "node:path";
import type { ResolvedCourse } from "../prepareCourses";

export function getAllPagePaths(courses: ResolvedCourse[]) : PageSource[] {
  return [
    ...courses.flatMap(buildCoursePagePaths),
    ...groupInfoPaths(courses),
  ];
}

function buildCoursePagePaths(course: ResolvedCourse): PageSource[] {
  const { slug, group, subject, topics } = course;

  return topics
  .filter((topic) => topic.status !== "locked")
  .flatMap((topic) => {
    const baseDir = path.join("base", subject.id, topic.topic);
    const targetDir = path.join("docs", group.id, slug, topic.topic);
    const files: PageSource[] = [];

    // Topic overview
    const topicOverview: PageSource = {
        source: path.join(baseDir, pickSourceFile(topic.status)),
        target: path.join(targetDir, "index.md"),
        label: topic.label,
      }

    if (topic.chapters.length <= 1) {
      files.push(topicOverview);
      return files;
    }

    files.push(topicOverview);

    // Chapter overview
    topic.chapters.forEach((chapter) => {
      if (chapter.chapter === topic.topic) return;

      files.push({
        source: path.join(baseDir, "chapters", chapter.chapter, pickSourceFile(chapter.status)),
        target: path.join(targetDir, `${chapter.slug}.md`),
        label: chapter.label,
        worksheets: chapter.worksheets
      });
    });

    return files;
  });
}

function pickSourceFile(status: Status) {
  return status === "finished" ? "overview.md" : "preview.md";
}

function groupInfoPaths(courses: ResolvedCourse[]): PageSource[] {
  const groups = [...new Set(courses.map((c) => c.group.id))];

  return groups.map((group) => ({
    source: path.join("courses", group, "group_info.md"),
    target: path.join("resources", group, "group_info.md"),
    label: "Leitsätze",
  }));
}
