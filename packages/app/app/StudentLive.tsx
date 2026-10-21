import { useCallback, type ReactNode } from "react";
import { useLocation } from "react-router";
import { coursePath, findChapter } from "../src/modules/courses";
import {
  LiveQuizProvider,
  useSite,
  type DeviceArea,
  type Target,
} from "../src/modules/classroom";
import { worksheetLinks } from "./worksheetLinks";

/** The calm view: where a student device rests during a lesson. */
export const CALM_PATH = "/unterricht";

const quizPath = (courseId: string) => `${coursePath(courseId)}/quiz`;

/** Where a page belongs for the device's way back to the calm view. */
export function areaOf(pathname: string): DeviceArea {
  if (pathname === CALM_PATH) {
    return "calm";
  }
  if (/^\/courses\/[^/]+\/quiz$/.test(pathname)) {
    return "quiz";
  }
  return /\/sheets\/|\/challenges$/.test(pathname) ? "sheets" : "pages";
}

/** Where the worksheet the teacher sent lives: in the session's course, else in any that teaches it. */
export function useSheetPath() {
  const site = useSite();
  return useCallback(
    (target: Target, courseId: string | null) => {
      const teaching = site.courses.filter((course) =>
        findChapter(course, target.chapterId),
      );
      const course =
        teaching.find((item) => item.id === courseId) ?? teaching[0];
      const chapter = course && findChapter(course, target.chapterId);
      const sheet = site.index.worksheets[target.chapterId]?.find(
        (item) => item.id === target.id,
      );
      return course && chapter && sheet
        ? worksheetLinks(course.id, chapter.slug).sheet(sheet.slug)
        : null;
    },
    [site],
  );
}

/** The live quiz, the worksheets the teacher sends and the lesson's phase, for students. */
export function StudentLive({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const sheetPath = useSheetPath();
  const { pathname } = useLocation();
  return (
    <LiveQuizProvider
      enabled={enabled}
      area={areaOf(pathname)}
      calmPath={CALM_PATH}
      quizPath={quizPath}
      sheetPath={sheetPath}
    >
      {children}
    </LiveQuizProvider>
  );
}
