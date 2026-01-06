"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CourseId, getCourseId } from "@data/courses";

type RouteContextValue = {
  pathname: string;
  isAuthenticated: boolean;
  routeParam1?: string;
  routeParam2?: string;
  topic?: string;
  chapter?: string;
  worksheet?: string;
  isLibraryRoute: boolean;
  depth: number;
  hasTopicContext: boolean;
  groupKey?: string;
  subjectKey?: string;
  courseId?: CourseId;
  subject?: string;
  isHome: boolean;
  isLibrary: boolean;
  isPrinciples: boolean;
  isGroupOverview: boolean;
};

const RouteContext = createContext<RouteContextValue | undefined>(undefined);

const RESERVED_ROOTS = new Set(["library", "access", "worksheet"]);
const RESERVED_COURSE_SEGMENTS = new Set(["practice"]);

function buildRouteContext(pathname: string, isAuthenticated: boolean): RouteContextValue {
  const segments = pathname.split("/").filter(Boolean);
  const routeParam1 = segments[0];
  const routeParam2 = segments[1];
  const rawTopic = segments[2];
  const rawChapter = segments[3];
  const rawWorksheet = segments[4];

  const isLibraryRoute = routeParam1 === "library";
  const isHome = segments.length === 0 || pathname === "/";
  const isLibrary = isLibraryRoute;
  const isPrinciples =
    !isLibraryRoute && segments.length >= 2 && segments[1] === "principles";
  const isGroupOverview =
    segments.length === 1 && !!routeParam1 && !RESERVED_ROOTS.has(routeParam1);

  const groupKey = !isLibraryRoute ? routeParam1 : undefined;
  const subjectKey =
    !isLibraryRoute && routeParam2 && !isPrinciples ? routeParam2 : undefined;
  const courseId =
    groupKey && subjectKey ? getCourseId(groupKey, subjectKey) : undefined;
  const subject = isLibraryRoute ? routeParam2 : undefined;

  const isReservedTopicSegment = rawTopic ? RESERVED_COURSE_SEGMENTS.has(rawTopic) : false;
  const isReservedChapterSegment = rawChapter
    ? RESERVED_COURSE_SEGMENTS.has(rawChapter)
    : false;
  const topic = isReservedTopicSegment ? undefined : rawTopic;
  const chapter =
    isReservedTopicSegment || isReservedChapterSegment ? undefined : rawChapter;
  const worksheet =
    isReservedTopicSegment || isReservedChapterSegment ? undefined : rawWorksheet;

  const depth = segments.length;
  const hasTopicContext = Boolean(topic);

  return {
    pathname,
    isAuthenticated,
    routeParam1,
    routeParam2,
    topic,
    chapter,
    worksheet,
    isLibraryRoute,
    depth,
    hasTopicContext,
    groupKey,
    subjectKey,
    courseId,
    subject,
    isHome,
    isLibrary,
    isPrinciples,
    isGroupOverview,
  };
}

export function RouteProvider({
  children,
  isAuthenticated,
}: {
  children: ReactNode;
  isAuthenticated: boolean;
}) {
  const pathname = usePathname() ?? "/";
  const value = useMemo(
    () => buildRouteContext(pathname, isAuthenticated),
    [pathname, isAuthenticated]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
}

export function useRouteContext() {
  const context = useContext(RouteContext);
  if (!context) {
    throw new Error("useRouteContext must be used within RouteProvider");
  }
  return context;
}
