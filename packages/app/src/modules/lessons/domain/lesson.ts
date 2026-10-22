import type { JsonValue } from "../../catalog";
import type { GraphicChanges } from "../../content-renderer";

/**
 * A running lesson: the teacher's position, the ink and the branches,
 * kept apart from the authored deck.
 */

/** A blank surface inserted during the lesson after a slide (5 → 5a). */
export type Blank = {
  id: string;
  afterFrameId: string;
  /** A task of the slide's worksheet that was taken onto this surface. */
  task?: { sheetId: string; taskId: string };
};

export type InkColor = "graphit" | "violett" | "signal";

export type InkStroke = {
  id: string;
  /** A slide or a blank surface. */
  frameId: string;
  color: InkColor;
  /** In the logical 1280 × 720 surface. */
  points: [number, number][];
};

/** What the lesson changed on a Grafikfolie, by slide; see `GraphicChanges`. */
export type GraphicSlides = Record<string, GraphicChanges>;

/** The state of each Komponentenfolie, by slide, as its view keeps it (JSON). */
export type ComponentSlides = Record<string, JsonValue>;

/** What the teacher does with one deck during a lesson. */
export type DeckState = {
  currentFrameId: string;
  /** Lesson time (s) when the current slide was entered. */
  enteredAt: number;
  blanks: Blank[];
  ink: InkStroke[];
  hidden: boolean;
  /** The slide whose worksheet the projector shows instead of the slide. */
  sheetShown?: string | null;
  /** The exact image the projector keeps while the teacher navigates. */
  frozen?: {
    currentFrameId: string;
    blanks: Blank[];
    ink: InkStroke[];
    sent: string[];
    hidden: boolean;
    sheetShown?: string | null;
    graphics?: GraphicSlides;
    components?: ComponentSlides;
  } | null;
  /** Sliders and hidden curves of the Grafikfolien; they stay when the slide changes. */
  graphics?: GraphicSlides;
  /** The state of the Komponentenfolien; it stays when the slide changes. */
  components?: ComponentSlides;
  /** Slides whose sheet the class was sent to. */
  sent: string[];
  /** Ink taken off a frame by "clear", newest last, so undo can bring it back. */
  cleared?: { frameId: string; strokes: InkStroke[] }[];
};

/** The logical size every slide is laid out in. */
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
