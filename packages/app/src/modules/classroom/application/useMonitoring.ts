import { useMemo } from "react";
import type { SheetMonitoring } from "../../worksheets";
import type { SheetTotals } from "../domain/monitoring";
import { useSite } from "../ui/SiteContext";
import { useSharedClassroom } from "./useClassroom";

/** The totals per section as "reached it": everyone further along counts too. */
function reachedSections(reached: number[], sectionCount: number): number[] {
  return Array.from({ length: sectionCount }, (_, i) =>
    reached.slice(i).reduce((sum, count) => sum + (count ?? 0), 0),
  );
}

/** The class's figures for one sheet; nothing reported yet is all zero. */
export function monitoringFrom(
  sheetId: string,
  registered: number,
  sectionCount: number,
  totals: SheetTotals | undefined,
): SheetMonitoring {
  return {
    registered,
    working: totals?.working ?? 0,
    done: totals?.done ?? 0,
    sections: reachedSections(totals?.reached ?? [], sectionCount),
    challenges: totals?.challenges ?? 0,
    ampel: {
      sheetId,
      answered: totals?.ampel.answered ?? 0,
      total: registered,
      levels: totals?.ampel.levels ?? { green: 0, yellow: 0, red: 0 },
      causes: totals?.ampel.causes ?? {},
    },
  };
}

/**
 * The class's anonymous totals for one worksheet, from the controller's
 * snapshot of the running session; null until the first snapshot arrives.
 */
export function useTeacherMonitoring(
  sheetId: string,
  sectionCount: number,
): SheetMonitoring | null {
  const { classroom } = useSite();
  const { snapshot } = useSharedClassroom(classroom?.role === "controller");
  const controller = snapshot?.role === "controller" ? snapshot : null;
  return useMemo(
    () =>
      controller
        ? monitoringFrom(
            sheetId,
            controller.participants.filter((item) => item.connected).length,
            sectionCount,
            controller.monitoring[sheetId],
          )
        : null,
    [controller, sheetId, sectionCount],
  );
}
