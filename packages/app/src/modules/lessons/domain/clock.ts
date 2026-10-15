import type { Deck, Slide } from "./deck";

/** A school period, in minutes after midnight. */
export type Period = { number: number; start: number; end: number };

/** Where lesson time counts from, fixed when the lesson starts. */
export type ClockStart = {
  /** Epoch ms of the start of the period, or of the lesson ("ab jetzt"). */
  startsAt: number;
  /** The period it counts from; null: from the moment the lesson started. */
  periodNumber: number | null;
};

const minutesOf = (date: Date) =>
  date.getHours() * 60 + date.getMinutes() + date.getSeconds() / 60;

/**
 * The period a lesson started at `now` belongs to: the start nearest in
 * time, switching exactly midway between two starts (the break included).
 * Before the first period it is the first one; after the last one has
 * ended, or without a timetable, there is none.
 */
export function nearestPeriod(now: Date, periods: Period[]): Period | null {
  const first = periods[0];
  const last = periods.at(-1);
  if (!first || !last) {
    return null;
  }
  const minutes = minutesOf(now);
  if (minutes < first.start) {
    return first;
  }
  if (minutes >= last.end) {
    return null;
  }
  const started = periods.filter((period) => period.start <= minutes);
  const current = started.at(-1) ?? first;
  const next = periods[started.length];
  return next && minutes >= (current.start + next.start) / 2 ? next : current;
}

/** The clock start for a period, or for "ab jetzt" (`null`) from `now`. */
export function clockStartFor(now: Date, period: Period | null): ClockStart {
  if (!period) {
    return { startsAt: now.getTime(), periodNumber: null };
  }
  const start = new Date(now);
  start.setHours(Math.floor(period.start / 60), period.start % 60, 0, 0);
  return { startsAt: start.getTime(), periodNumber: period.number };
}

/** The clock start of a lesson that begins now; chosen once, not recomputed. */
export function lessonStart(now: Date, periods: Period[]): ClockStart {
  return clockStartFor(now, nearestPeriod(now, periods));
}

/** What the teacher may correct to: the period before, the chosen one, "ab jetzt". */
export function startChoices(
  periods: Period[],
  chosen: number | null,
): (Period | null)[] {
  const index = periods.findIndex((period) => period.number === chosen);
  const around =
    index < 0
      ? periods.slice(-2)
      : periods.slice(Math.max(0, index - 1), index + 1);
  return [...around, null];
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

/**
 * Time left until the planned end of a frame, negative once it is over; null
 * where the deck has no plan up to this frame.
 */
export function remaining(
  deck: Deck,
  frameId: string,
  now: number,
): number | null {
  const end = plannedEnd(deck, frameId);
  return end > 0 ? end - now : null;
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
