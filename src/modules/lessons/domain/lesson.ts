/**
 * A running lesson: the teacher's position, the ink and the branches,
 * kept apart from the authored deck.
 */

/** A blank surface inserted during the lesson after a slide (5 → 5a). */
export type Blank = { id: string; afterFrameId: string };

export type InkColor = "graphit" | "violett" | "signal";

export type InkStroke = {
  id: string;
  /** A slide or a blank surface. */
  frameId: string;
  color: InkColor;
  /** In the logical 1280 × 720 surface. */
  points: [number, number][];
};

export type LessonSession = {
  id: string;
  chapterId: string;
  /** The deck this session runs; slide ids are its placement ids. */
  presentationId: string;
  /** When the session was opened (ms), for the archive. */
  openedAt: number;
  currentFrameId: string;
  /** Lesson time (s) when the current slide was entered. */
  enteredAt: number;
  blanks: Blank[];
  ink: InkStroke[];
  hidden: boolean;
  /** The exact image the projector keeps while the teacher navigates. */
  frozen?: {
    currentFrameId: string;
    blanks: Blank[];
    ink: InkStroke[];
    sent: string[];
    hidden: boolean;
  } | null;
  /** Slides whose sheet the class was sent to. */
  sent: string[];
};

/** The logical size every slide is laid out in. */
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
