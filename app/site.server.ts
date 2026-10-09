import type { PublicCatalog } from "../src/modules/catalog";
import { readViewer, type SiteData } from "../src/modules/classroom";
import {
  getCatalog,
  publicCatalog,
  teacherCatalog,
} from "../src/modules/catalog/server/catalog.server";
import { currentReleases } from "../src/modules/classroom/application/currentSession.server";
import {
  coursesFromCatalog,
  getConfiguredCourse,
} from "../src/modules/courses";

/** The courses with the teacher's arrangement; needs no session. */
export function loadCourses(request: Request) {
  const base = coursesFromCatalog(getCatalog());
  return base.flatMap((course) => {
    const configured = getConfiguredCourse(base, course.id, request);
    return configured ? [configured] : [];
  });
}

/**
 * Students receive the redacted catalog; the teacher the complete one,
 * answers and notes included. What counts as released is whatever the
 * browser's Classroom Session says; without a session nothing is released.
 * Courses carry the teacher's arrangement.
 */
export async function loadSite(request: Request): Promise<SiteData> {
  const viewer = readViewer(request);
  const full = getCatalog();
  const { releases, view, snapshot } = await currentReleases(request);
  const catalog: PublicCatalog =
    viewer === "teacher" ? teacherCatalog() : publicCatalog(releases);
  const courses = loadCourses(request);
  return {
    viewer,
    catalog,
    courses,
    releasedSummaries: view.summaries,
    summaryRules: Object.fromEntries(
      full.chapters.map((chapter) => [
        chapter.id,
        view.rules[chapter.id] ?? "manuell",
      ]),
    ),
    releasedSolutions: view.solutions,
    classroom: snapshot && {
      code: snapshot.code,
      role: snapshot.role,
      title: snapshot.title,
    },
  };
}
