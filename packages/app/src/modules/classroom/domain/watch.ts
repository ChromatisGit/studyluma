import type { Snapshot } from "./protocol";

/** What a connection has learned about the session it follows. */
export type Watch = {
  /** A session was seen. */
  seen: boolean;
  /** How often in a row it was missing since. */
  missing: number;
};

export const WATCH_START: Watch = { seen: false, missing: 0 };

/** A session that has been missing this often in a row is over. */
const MISSES_UNTIL_GONE = 2;

export type Observed = {
  watch: Watch;
  /** Show this answer; false for a miss that may still be a hiccup. */
  adopt: boolean;
  /** The session is over (ended, or expired while no socket was open). */
  over: boolean;
};

/**
 * Reads one answer of the server. A session the server no longer knows ended
 * or expired while no socket was open; one miss may be a hiccup, so a second
 * confirms it. Pure: the connection acts on the result.
 */
export function observe(watch: Watch, next: Snapshot | null): Observed {
  if (next === null && watch.seen) {
    const missing = watch.missing + 1;
    return {
      watch: { seen: true, missing },
      adopt: false,
      over: missing >= MISSES_UNTIL_GONE,
    };
  }
  return {
    watch: { seen: watch.seen || next !== null, missing: 0 },
    adopt: true,
    over: next?.status === "ended",
  };
}
