import { useMemo, useSyncExternalStore, type ReactNode } from "react";
import { useParams } from "react-router";
import { RichReferenceContext } from "../../content-renderer";
import { chapterPathById, type Course } from "../../courses";
import { ClassroomConnection } from "./ClassroomConnection";
import { SiteContext, type SiteData } from "./SiteContext";
import { localReleases } from "../infrastructure/localReleases";

const teaches = (course: Course, chapterId: string) =>
  course.topics.some((topic) =>
    topic.chapters.some((chapter) => chapter.id === chapterId),
  );

/** Where each Merkkarte can be read, in the course being read. */
function merkkarteHrefs(site: SiteData, courseId?: string) {
  const hrefs: Record<string, string> = {};
  for (const summary of site.catalog.summaries) {
    const course =
      site.courses.find(
        (item) => item.id === courseId && teaches(item, summary.chapterId),
      ) ?? site.courses.find((item) => teaches(item, summary.chapterId));
    if (!course) {
      continue;
    }
    for (const card of summary.merkkarten) {
      hrefs[card.id] =
        `${chapterPathById(course, summary.chapterId)}#${card.anchor}`;
    }
  }
  return hrefs;
}

export function SiteProvider({
  site,
  children,
}: {
  site: SiteData;
  children: ReactNode;
}) {
  const { courseId } = useParams();
  localReleases.setDefaults(site.defaultReleasedSummaries);
  const releases = useSyncExternalStore(
    localReleases.subscribe,
    localReleases.getSnapshot,
    localReleases.getServerSnapshot,
  );
  const current = useMemo(
    () =>
      site.localReleases
        ? {
            ...site,
            releasedSummaries: releases.summaries,
            releasedSolutions: releases.solutions,
            summaryRules: { ...site.summaryRules, ...releases.rules },
          }
        : site,
    [site, releases],
  );
  const hrefs = useMemo(
    () => merkkarteHrefs(current, courseId),
    [current, courseId],
  );
  return (
    <SiteContext.Provider value={current}>
      <RichReferenceContext.Provider value={hrefs}>
        {/* The teacher's one connection, on every page, so a running unit sees its teacher. */}
        <ClassroomConnection>{children}</ClassroomConnection>
      </RichReferenceContext.Provider>
    </SiteContext.Provider>
  );
}
