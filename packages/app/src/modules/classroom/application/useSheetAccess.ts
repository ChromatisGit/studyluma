import { useCallback, useSyncExternalStore } from "react";
import { useRevalidator } from "react-router";
import { chapterStore } from "../../worksheets";
import { targetStore, type ActiveTarget } from "../infrastructure/targetStore";
import { useSite } from "../ui/SiteContext";
import { postClassroom } from "./useClassroom";

/**
 * Unlocks and locks a worksheet for the class. In a Classroom Session the
 * decision goes to the session, which hands it to every student device;
 * without one it is this browser's own (Demo, a teacher preparing).
 */
export function useSheetAccess(courseId: string, chapterId: string) {
  const { sessionSheets } = useSite();
  const revalidator = useRevalidator();
  const store = chapterStore(chapterId);
  return useCallback(
    (sheetId: string, released: boolean) => {
      if (!sessionSheets) {
        store.setUnlocked(sheetId, released);
        return;
      }
      const data = new FormData();
      data.set("intent", "unlockSheet");
      data.set("chapterId", chapterId);
      data.set("sheetId", sheetId);
      data.set("released", String(released));
      void fetch(`/courses/${encodeURIComponent(courseId)}/overview`, {
        method: "POST",
        body: data,
      }).then((response) => {
        if (response.ok) {
          void revalidator.revalidate();
        }
      });
    },
    [sessionSheets, store, courseId, chapterId, revalidator],
  );
}

/**
 * The worksheet sent to the class: the session's while this browser belongs
 * to one, otherwise this browser's own.
 */
export function useSentTarget(courseId: string): {
  active: ActiveTarget;
  send: (target: ActiveTarget) => void;
} {
  const site = useSite();
  const revalidator = useRevalidator();
  const local = targetStore(courseId);
  const stored = useSyncExternalStore(
    local.subscribe,
    local.getSnapshot,
    local.getServerSnapshot,
  );
  const inSession = site.classroom !== null;
  const send = useCallback(
    (target: ActiveTarget) => {
      if (site.classroom?.role !== "controller") {
        local.set(target);
        return;
      }
      void postClassroom({
        intent: "act",
        payload: { type: "target", target },
      }).then((ok) => {
        if (ok) {
          void revalidator.revalidate();
        }
      });
    },
    [site.classroom?.role, local, revalidator],
  );
  return { active: inSession ? site.sessionTarget : stored, send };
}
