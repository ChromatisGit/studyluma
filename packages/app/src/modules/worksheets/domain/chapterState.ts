import type { AmpelResponse, Mode, PartResponse } from "./contract";

/**
 * The in-browser state for one chapter. Student answers are
 * keyed by the contract's stable ids; the teacher's decisions (unlocked
 * sheets, released solutions) override the fixture.
 */
export type ChapterState = {
  responses: Record<string, PartResponse>;
  modes: Record<string, Mode>;
  /** Demo feedback stays in memory and is cleared on reload. */
  ampels: Record<string, AmpelResponse>;
  /** Sheets a student has opened since they were unlocked. */
  seen: Record<string, boolean>;
  /** Last open tab per sheet. */
  tabs: Record<string, string>;
  unlocked: Record<string, boolean>;
  released: Record<string, boolean>;
};

export const emptyChapterState = (): ChapterState => ({
  responses: {},
  modes: {},
  ampels: {},
  seen: {},
  tabs: {},
  unlocked: {},
  released: {},
});
