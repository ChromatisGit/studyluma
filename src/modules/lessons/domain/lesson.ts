/**
 * Lesson frames: the teacher's workspace in whole-class phases. The data
 * is what the pipeline will produce from a chapter's `tafel.md`.
 */
export type FrameFamily =
  "einstieg" | "erarbeitung" | "uebung" | "sicherung" | "quiz";

export type FrameBlock =
  | { type: "markdown"; markdown: string }
  /** A list whose items are "left → right": a two-column overview. */
  | { type: "arrows"; rows: [string, string][] }
  | { type: "image"; asset: string; alt: string }
  /** Several `###` without a type: side by side; empty ones are writing zones. */
  | { type: "areas"; areas: { label: string; markdown?: string }[] }
  /** `::merkkarte{#id}`, resolved from the chapter summary. */
  | {
      type: "merkkarte";
      id: string;
      title: string;
      origin: string;
      rule: string;
      examples?: string | null;
    }
  /** `::blatt{id}`: the worksheet of the following work phase. */
  | { type: "sheet"; sheetId: string; title: string; topic?: string }
  | {
      type: "quiz";
      questions: {
        prompt: string;
        options: { label: string; correct: boolean }[];
      }[];
    };

export interface LessonFrame {
  /** Slug of the title. */
  id: string;
  /** From "# Stunde n". */
  lesson: number;
  /** Position in the plan, "1" to "12". */
  number: string;
  /** "Beispiel", "Merksatz", … */
  marking?: string;
  family?: FrameFamily;
  title: string;
  /** Seconds from the start of the lesson, from `::bis{…}`. */
  planUntil?: number;
  /** Content top to bottom… */
  blocks?: FrameBlock[];
  /** …or in two columns (`::spalte`). */
  columns?: FrameBlock[][];
  /** `::notiz`, teacher only. */
  notes?: string;
}

export interface Lesson {
  chapterId: string;
  title: string;
  lessons: { number: number; title: string }[];
  frames: LessonFrame[];
}

/** A blank surface inserted during the lesson after a frame (5 → 5a). */
export type Blank = { id: string; afterFrameId: string };

export type InkColor = "graphit" | "violett" | "signal";

export type InkStroke = {
  id: string;
  /** A frame or a blank surface. */
  frameId: string;
  color: InkColor;
  /** In the logical 1280 × 720 surface. */
  points: [number, number][];
};

export type LessonSession = {
  id: string;
  chapterId: string;
  /** When the session was opened (ms), for the archive. */
  openedAt: number;
  currentFrameId: string;
  /** Lesson time (s) when the current frame was entered. */
  enteredAt: number;
  blanks: Blank[];
  ink: InkStroke[];
  hidden: boolean;
  /** Frames whose sheet the class was sent to (simulated). */
  sent: string[];
};

/** The logical size every frame is laid out in. */
export const FRAME_WIDTH = 1280;
export const FRAME_HEIGHT = 720;
