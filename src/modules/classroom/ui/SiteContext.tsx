import { createContext, useContext } from "react";
import type { Course } from "../../courses";
import type { ViewerRole } from "../domain/viewer";
import type { PublicCatalog, SummaryRule } from "../../catalog";

/** What every page knows: the catalog for this reader and the courses. */
export type SiteData = {
  viewer: ViewerRole;
  catalog: PublicCatalog;
  courses: Course[];
  /** Chapters whose Inhalt the teacher released. */
  releasedSummaries: string[];
  /** How each chapter's Inhalt opens (default: manual). */
  summaryRules: Record<string, SummaryRule>;
  /** Tasks whose solution the teacher released. */
  releasedSolutions: string[];
  /** The Classroom Session this browser belongs to, if one is running. */
  classroom: {
    code: string;
    role: "controller" | "participant";
    title: string;
  } | null;
};

export const SiteContext = createContext<SiteData | null>(null);

export function useSite(): SiteData {
  const site = useContext(SiteContext);
  if (!site) {
    throw new Error("The site data was not loaded");
  }
  return site;
}

/** Whether the reader may read a chapter's Inhalt: teachers always can. */
export function canReadSummary(site: SiteData, chapterId: string): boolean {
  return (
    site.viewer === "teacher" || site.releasedSummaries.includes(chapterId)
  );
}
