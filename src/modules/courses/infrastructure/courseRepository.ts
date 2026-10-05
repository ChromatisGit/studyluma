import type { Course } from "../domain/course";
import courses from "./fixtures/courses.json";

/**
 * Course data from JSON fixtures. A database replaces this file later;
 * nothing else reads the fixtures.
 */
const all = courses as Course[];

const summaries = import.meta.glob<string>("./fixtures/summaries/*.md", {
  query: "?raw",
  import: "default",
  eager: true,
});

export function listCourses(): Course[] {
  return all;
}

export function getCourse(courseId: string): Course | undefined {
  return all.find((course) => course.id === courseId);
}

/** The chapter summary (Zusammenfassung) as Markdown, if there is one. */
export function getSummary(chapterId: string): string | undefined {
  return summaries[`./fixtures/summaries/${chapterId}.md`];
}
