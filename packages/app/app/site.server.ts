import { requestMemo } from "@chromatis/base/request-scope";
import { app } from "chromatis-config";
import type { PublicCatalog, Releases } from "../src/modules/catalog";
import { readViewer, type SiteData } from "../src/modules/classroom";
import {
  catalogIndex,
  getCatalog,
  publicCatalog,
  teacherCatalog,
} from "../src/modules/catalog/server/catalog.server";
import { classroomEnabled } from "../src/modules/classroom/server/classroom.server";
import { currentReleases } from "../src/modules/classroom/application/currentSession.server";
import { joinOriginFor } from "../src/modules/directory";
import {
  coursesFromCatalog,
  getConfiguredCourse,
  sheetsFor,
} from "../src/modules/courses";
import type { SheetsData, SheetsShown } from "../src/modules/worksheets";

/** The courses with the teacher's arrangement; needs no session. */
export function loadCourses(request: Request) {
  const base = coursesFromCatalog(getCatalog());
  return base.flatMap((course) => {
    const configured = getConfiguredCourse(base, course.id, request);
    return configured ? [configured] : [];
  });
}

type Reader = { site: SiteData; releases: Releases };

/**
 * Students receive redacted content; the teacher everything, answers and
 * notes included. What counts as released is whatever the browser's
 * Classroom Session says; without a session nothing is released.
 */
async function readReader(request: Request): Promise<Reader> {
  const viewer = await readViewer(request);
  const full = getCatalog();
  const { releases, view, snapshot } = await currentReleases(request);
  const localReleases = !classroomEnabled();
  const courses = loadCourses(request);
  // The demo opens on the course's starting chapter with its Inhalt released.
  const defaultReleasedSummaries = localReleases
    ? coursesFromCatalog(full).flatMap((course) =>
        course.currentChapterId ? [course.currentChapterId] : [],
      )
    : [];
  return {
    // With local releases the browser decides, so every Inhalt goes along.
    releases: localReleases ? { ...releases, summary: () => true } : releases,
    site: {
      viewer,
      index: catalogIndex(),
      courses,
      releasedSummaries: [
        ...new Set([...view.summaries, ...defaultReleasedSummaries]),
      ],
      summaryRules: Object.fromEntries(
        full.chapters.map((chapter) => [
          chapter.id,
          view.rules[chapter.id] ?? "manuell",
        ]),
      ),
      releasedSolutions: view.solutions,
      sessionSheets: snapshot ? view.sheets : null,
      sessionTarget: snapshot?.target ?? null,
      classroom: snapshot && {
        code: snapshot.code,
        role: snapshot.role,
        title: snapshot.title,
      },
      classroomEnabled: classroomEnabled(),
      localReleases,
      defaultReleasedSummaries,
      joinOrigin: joinOriginFor(app),
    },
  };
}

/**
 * The root, the shell and the page loaders each get their own `Request`, so
 * what a request has worked out is memoised in its scope (`requestMemo`): the
 * session is read once and a chapter is redacted once; the same object also
 * serialises once.
 */
const reader = (request: Request) =>
  requestMemo("reader", () => readReader(request));

/** What every page knows; no content (see `loadCatalog`). */
export async function loadSite(request: Request): Promise<SiteData> {
  return (await reader(request)).site;
}

/** The content of these chapters, as this request's reader may see it. */
export async function loadCatalog(
  request: Request,
  chapterIds: readonly string[],
): Promise<PublicCatalog> {
  const { site, releases } = await reader(request);
  const ids = [...new Set(chapterIds)].sort();
  return requestMemo(`catalog:${ids.join(",")}`, () =>
    site.viewer === "teacher"
      ? teacherCatalog(ids)
      : publicCatalog(releases, ids),
  );
}

/**
 * A chapter's worksheets as read in a course, for this request's reader:
 * what the page shows in full, the rest as outlines.
 */
export async function loadSheets(
  request: Request,
  courseId: string,
  chapterId: string,
  shown: SheetsShown,
): Promise<SheetsData | undefined> {
  const site = await loadSite(request);
  const catalog = await loadCatalog(request, [chapterId]);
  const key = typeof shown === "object" ? `sheet:${shown.sheetId}` : shown;
  return requestMemo(`sheets:${courseId}:${chapterId}:${key}`, () =>
    sheetsFor({ ...site, catalog }, courseId, chapterId, shown),
  );
}
