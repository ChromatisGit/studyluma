import type { Deck, Slide } from "./deck";

/** A school period, in minutes after midnight. */
export type Period = { number: number; start: number; end: number };

/**
 * Lesson time counts from the start of the period, not from opening the
 * presentation. During a break it refers to the next period (negative
 * until it starts). Outside the timetable it counts from `openedAt`.
 */
export function lessonStart(
  now: Date,
  periods: Period[],
  openedAt: Date,
): { start: Date; period: Period | null } {
  const minutes =
    now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
  const at = (minute: number) => {
    const date = new Date(now);
    date.setHours(Math.floor(minute / 60), minute % 60, 0, 0);
    return date;
  };
  const current = periods.find(
    (period) => minutes >= period.start && minutes < period.end,
  );
  if (current) {
    return { start: at(current.start), period: current };
  }
  const next = periods.find((period) => period.start > minutes);
  const previous = [...periods]
    .reverse()
    .find((period) => period.end <= minutes);
  if (next && previous) {
    return { start: at(next.start), period: next };
  }
  return { start: openedAt, period: null };
}

/** The planned end of a frame; frames without `::bis` keep the previous plan. */
export function plannedEnd(deck: Deck, frameId: string): number {
  let plan = 0;
  for (const frame of deck.slides) {
    plan = frame.planUntil ?? plan;
    if (frame.id === frameId) {
      return plan;
    }
  }
  return plan;
}

/** The planned start of a frame: the end of the frame before it. */
export function plannedStart(deck: Deck, frame: Slide): number {
  const index = deck.slides.indexOf(frame);
  const previous = deck.slides[index - 1];
  return previous ? plannedEnd(deck, previous.id) : 0;
}

/**
 * How far the lesson is behind (+) or ahead (−) of the plan: how late the
 * frame was entered, growing once time passes its planned end.
 * `abweichung = max(betreten − geplanterBeginn, jetzt − geplantesEnde)`
 */
export function deviation(
  deck: Deck,
  frame: Slide,
  enteredAt: number,
  now: number,
): number {
  return Math.max(
    enteredAt - plannedStart(deck, frame),
    now - plannedEnd(deck, frame.id),
  );
}

/** "10:20", "−1:40" */
export function formatSeconds(seconds: number, sign = false): string {
  const total = Math.round(Math.abs(seconds));
  const text = `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
  if (!sign) {
    return seconds < 0 ? `−${text}` : text;
  }
  return `${seconds < 0 ? "−" : "+"}${text}`;
}
