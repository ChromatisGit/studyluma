import { useMemo, type ReactNode } from "react";
import { useParams } from "react-router";
import { RichReferenceContext } from "../../content-renderer";
import { chapterPath, type Course } from "../../courses";
import { SiteContext, type SiteData } from "./SiteContext";

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
        `${chapterPath(course.id, summary.chapterId)}#${card.anchor}`;
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
  const hrefs = useMemo(() => merkkarteHrefs(site, courseId), [site, courseId]);
  return (
    <SiteContext.Provider value={site}>
      <RichReferenceContext.Provider value={hrefs}>
        {children}
      </RichReferenceContext.Provider>
    </SiteContext.Provider>
  );
}
