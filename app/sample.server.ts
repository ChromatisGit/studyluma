import {
  nothingReleased,
  publicCatalog,
} from "../src/modules/catalog/server/catalog.server";
import { sheetsFor } from "../src/modules/courses";
import { loadCourses } from "./site.server";

/**
 * A real task for a public page: the first answerable task of the first
 * course. It always comes from the redacted catalog, whoever asks.
 */
export function sampleTask(request: Request) {
  const site = {
    courses: loadCourses(request),
    viewer: "student" as const,
    catalog: publicCatalog(nothingReleased),
    releasedSolutions: [],
  };
  for (const course of site.courses) {
    for (const topic of course.topics) {
      for (const chapter of topic.chapters) {
        const data = sheetsFor(site, course.id, chapter.id);
        for (const sheet of data?.sheets ?? []) {
          for (const section of sheet.sections) {
            for (const item of section.items) {
              if (
                item.type === "task" &&
                item.task.items.some(
                  (child) =>
                    child.type === "part" &&
                    (child.part.type === "Antwort" ||
                      child.part.type === "Einsetzen"),
                )
              ) {
                return { chapter: data, aufgabeId: item.task.id };
              }
            }
          }
        }
      }
    }
  }
  return { chapter: undefined, aufgabeId: "" };
}
