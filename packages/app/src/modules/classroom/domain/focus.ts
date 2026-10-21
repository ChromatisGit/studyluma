import type { Phase } from "./session";

/**
 * What a student device shows during a lesson. Pure: the provider feeds in
 * the session's phase and the page the student is on and acts on the answer.
 *
 * A web page cannot lock a device: "locked" means no visible way there and
 * an automatic return to the calm view.
 */

/** Where a page belongs: the calm view, the quiz, worksheets and challenges, the rest. */
export type DeviceArea = "calm" | "quiz" | "sheets" | "pages";

/** Seconds the device waits before it brings the student back. */
export const RETURN_SECONDS = 10;

/** Green slides: the students act. */
export const isGreen = (phase: Phase) => phase !== "unterricht";

/** How much of the course a phase opens. */
const ACCESS: Record<Phase, number> = {
  unterricht: 0,
  austausch: 0,
  aufgabe: 1,
  arbeitsblatt: 2,
};

/** Whether the student may stay on a page of this area in this phase. */
export function allows(
  phase: Phase,
  area: DeviceArea,
  quizRunning: boolean,
): boolean {
  switch (area) {
    case "calm":
      return true;
    case "quiz":
      return quizRunning;
    case "sheets":
      return phase === "arbeitsblatt";
    case "pages":
      return ACCESS[phase] >= 1;
  }
}

/**
 * Leaving a green phase for one that opens less (or for Unterricht) gives
 * the class a visible countdown to finish the sentence; every other change
 * shows at once.
 */
export function needsCountdown(from: Phase, to: Phase): boolean {
  return (
    from !== to &&
    isGreen(from) &&
    (to === "unterricht" || ACCESS[to] < ACCESS[from])
  );
}
