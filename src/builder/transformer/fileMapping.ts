import type { CoursePlan } from "@schema/course-plan"
import path from "node:path";

interface FileMapping {
  source: string;
  target: string;
}

function buildTopicFileMappings(courses: CoursePlan[]): FileMapping[] {
  return courses.flatMap(({ group, subject, topics, course_variant }) =>
    topics.map(({ topic, chapter }) => {
      const baseDir = path.join("base", subject, topic, "chapters");
      const targetDir = path.join("courses", group, course_variant, topic);

      if (topic === chapter) {
        return {
          source: path.join(baseDir, "website.md"),
          target: path.join(targetDir, "index.md"),
        };
      }

      return {
        source: path.join(baseDir, chapter, "website.md"),
        target: path.join(targetDir, `${chapter}.md`),
      };
    }),
  );
}

function buildPrinciplesFileMappings(courses: CoursePlan[]): FileMapping[] {
  const groups = [...new Set(courses.map(c => c.group))];

  return groups.map(group => ({
    source: path.join("courses", group, "principles.md"),
    target: path.join("courses", "shared", group, "principles.md"),
  }));
}

export function buildCourseFileMappings(courses: CoursePlan[]): FileMapping[] {
  return [
    ...buildTopicFileMappings(courses),
    ...buildPrinciplesFileMappings(courses),
  ];
}