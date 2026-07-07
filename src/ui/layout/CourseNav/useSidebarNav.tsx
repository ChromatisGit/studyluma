import { useMatches } from "react-router";
import type { NavItem } from "@chromatis/base";
import { useRouteContext } from "@ui/contexts/RouteContext";
import { useDemoProgress } from "@ui/demo/useDemoProgress";
import type { ProgressDTO, SidebarDTO } from "@schema/courseTypes";
import { CourseNavTree } from "./CourseNavTree";
import { CourseList } from "./CourseList";

/**
 * Shared sidebar nav logic for the app shells (normal + demo mode).
 *
 * Shows the current course's topic/chapter tree while inside a topic,
 * falls back to the flat course list, and otherwise to the given
 * default nav items.
 */
export function useSidebarNav(sidebarData: SidebarDTO, defaultMainNavItems: readonly NavItem[]) {
  const { hasTopicContext, topic, chapter, groupKey, subjectKey } = useRouteContext();
  const matches = useMatches();

  const matchWithProgress = matches
    .map((m) => m.data as { progress?: ProgressDTO; courseId?: string } | null)
    .find((d) => d?.progress != null);
  const progress = useDemoProgress(matchWithProgress?.courseId ?? "", matchWithProgress?.progress);

  const courseHref = groupKey && subjectKey ? `/${groupKey}/${subjectKey}` : "/";
  const hasCourses = sidebarData.courses.length > 0;

  const navSlot =
    hasTopicContext && progress && topic ? (
      <CourseNavTree
        progress={progress}
        currentTopic={topic}
        currentChapter={chapter}
        courseHref={courseHref}
      />
    ) : hasCourses ? (
      <CourseList courses={sidebarData.courses} />
    ) : null;

  const mainNavItems = hasCourses || hasTopicContext ? [] : defaultMainNavItems;

  return { navSlot, mainNavItems };
}
