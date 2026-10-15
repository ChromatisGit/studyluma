/**
 * What the class reports about a worksheet while a session runs, and the
 * anonymous totals the teacher sees. Reports are kept per participant only so
 * that a repeated report replaces the earlier one; nothing here leaves the
 * server except the totals.
 */

import type { AmpelCause, AmpelLevel } from "../../worksheets";

/** Worksheets a session keeps reports for. */
export const MAX_SHEETS = 60;
/** The furthest section index a report may name. */
export const MAX_SECTION = 99;

export type SheetProgress = {
  /** The furthest section (0-based) the participant has been in. */
  reached: number;
  done: boolean;
  /** Has begun the chapter's challenges. */
  challenges: boolean;
};

export type AmpelRating = { level: AmpelLevel; causes: AmpelCause[] };

export type SheetTotals = {
  /** Connected participants who report progress and are not done. */
  working: number;
  done: number;
  challenges: number;
  /** Per section index: how many participants' furthest section it is. */
  reached: number[];
  ampel: {
    answered: number;
    levels: Record<AmpelLevel, number>;
    causes: Partial<Record<AmpelCause, number>>;
  };
};

export const AMPEL_LEVELS: AmpelLevel[] = ["green", "yellow", "red"];
export const AMPEL_CAUSES: AmpelCause[] = [
  "topic",
  "task",
  "approach",
  "execution",
  "mistake",
  "other",
];

export type ProgressMap = Record<string, Record<string, SheetProgress>>;
export type AmpelMap = Record<string, Record<string, AmpelRating>>;

/** A report only ever moves forward: furthest section, done and challenges stay. */
export function mergeProgress(
  old: SheetProgress | undefined,
  next: SheetProgress,
): SheetProgress {
  return {
    reached: Math.max(old?.reached ?? 0, next.reached),
    done: !!old?.done || next.done,
    challenges: !!old?.challenges || next.challenges,
  };
}

/** The rating as stored: green carries no causes, the others need one. */
export function cleanRating(
  level: AmpelLevel,
  causes: AmpelCause[],
): AmpelRating | null {
  if (!AMPEL_LEVELS.includes(level)) {
    return null;
  }
  if (level === "green") {
    return { level, causes: [] };
  }
  const valid = [...new Set(causes)].filter((cause) =>
    AMPEL_CAUSES.includes(cause),
  );
  return valid.length > 0 ? { level, causes: valid } : null;
}

/** Whether a sheet id may be added to the reports of a session. */
export function sheetFits(
  maps: Record<string, unknown>[],
  sheetId: string,
): boolean {
  return maps.every(
    (map) => sheetId in map || Object.keys(map).length < MAX_SHEETS,
  );
}

export function totals(
  progress: ProgressMap,
  ampel: AmpelMap,
  connected: ReadonlySet<string>,
): Record<string, SheetTotals> {
  const result: Record<string, SheetTotals> = {};
  for (const sheetId of new Set([
    ...Object.keys(progress),
    ...Object.keys(ampel),
  ])) {
    const reports = Object.entries(progress[sheetId] ?? {});
    const reached: number[] = [];
    for (const [, report] of reports) {
      reached[report.reached] = (reached[report.reached] ?? 0) + 1;
    }
    const levels: Record<AmpelLevel, number> = {
      green: 0,
      yellow: 0,
      red: 0,
    };
    const causes: Partial<Record<AmpelCause, number>> = {};
    const ratings = Object.values(ampel[sheetId] ?? {});
    for (const rating of ratings) {
      levels[rating.level] += 1;
      for (const cause of rating.causes) {
        causes[cause] = (causes[cause] ?? 0) + 1;
      }
    }
    result[sheetId] = {
      working: reports.filter(([id, r]) => connected.has(id) && !r.done).length,
      done: reports.filter(([, r]) => r.done).length,
      challenges: reports.filter(([, r]) => r.challenges).length,
      reached: Array.from(
        { length: reached.length },
        (_, i) => reached[i] ?? 0,
      ),
      ampel: { answered: ratings.length, levels, causes },
    };
  }
  return result;
}

/**
 * The progress after a participant's report; the same object when it changes
 * nothing, null when the report is not valid.
 */
export function withProgress(
  progress: ProgressMap,
  participantId: string,
  report: SheetProgress & { sheetId: string },
): ProgressMap | null {
  if (
    !Number.isInteger(report.reached) ||
    report.reached < 0 ||
    report.reached > MAX_SECTION
  ) {
    return null;
  }
  const reports = progress[report.sheetId] ?? {};
  const old = reports[participantId];
  const merged = mergeProgress(old, report);
  if (
    old &&
    old.reached === merged.reached &&
    old.done === merged.done &&
    old.challenges === merged.challenges
  ) {
    return progress;
  }
  return {
    ...progress,
    [report.sheetId]: { ...reports, [participantId]: merged },
  };
}

/** The ratings after a participant's rating, which replaces their earlier one. */
export function withRating(
  ampel: AmpelMap,
  participantId: string,
  rating: { sheetId: string; level: AmpelLevel; causes: AmpelCause[] },
): AmpelMap | null {
  const clean = cleanRating(rating.level, rating.causes);
  return clean
    ? {
        ...ampel,
        [rating.sheetId]: { ...ampel[rating.sheetId], [participantId]: clean },
      }
    : null;
}
