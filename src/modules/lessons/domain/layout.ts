import type { Blank, FrameBlock, Lesson, LessonFrame } from "./lesson";

export type FrameLayout =
  "standard" | "fokus" | "spalten" | "flaeche" | "quiz" | "merkkarte";

const blocksOf = (frame: LessonFrame): FrameBlock[] =>
  frame.blocks ?? frame.columns?.flat() ?? [];

const textLength = (block: FrameBlock) =>
  block.type === "markdown" ? block.markdown.length : 0;

/**
 * The order in Markdown is the order on the frame; the system only picks
 * sizes. Focus and blank surface are the only automatic layouts.
 */
export function frameLayout(frame: LessonFrame): FrameLayout {
  const blocks = blocksOf(frame);
  if (!blocks.length) {
    return "flaeche";
  }
  if (frame.columns?.length) {
    return "spalten";
  }
  if (blocks.some((block) => block.type === "quiz")) {
    return "quiz";
  }
  if (blocks.length === 1 && blocks[0]?.type === "merkkarte") {
    return "merkkarte";
  }
  if (
    blocks.some(
      (block) =>
        block.type === "areas" && block.areas.some((area) => area.markdown),
    )
  ) {
    return "spalten";
  }
  const little =
    blocks.length === 1 &&
    (blocks[0]?.type === "sheet" ||
      (blocks[0]?.type === "markdown" &&
        textLength(blocks[0]) < 120 &&
        !blocks[0].markdown.includes("$ ")));
  return little ? "fokus" : "standard";
}

/** A column with an image gets two thirds; otherwise both are equal. */
export function columnWidths(columns: FrameBlock[][]): string {
  const image = columns.findIndex((column) =>
    column.some((block) => block.type === "image"),
  );
  if (image < 0 || columns.length !== 2) {
    return `repeat(${columns.length}, minmax(0, 1fr))`;
  }
  return image === 0 ? "2fr 1fr" : "1fr 2fr";
}

/** Where a standard frame keeps free space to write below its content. */
export function hasWritingSpace(frame: LessonFrame): boolean {
  const layout = frameLayout(frame);
  if (layout !== "standard") {
    return false;
  }
  const blocks = blocksOf(frame);
  return !blocks.some(
    (block) => block.type === "areas" || block.type === "arrows",
  );
}

/** An entry in the running order: a planned frame or a blank surface. */
export type OrderEntry =
  | { kind: "frame"; frame: LessonFrame }
  | { kind: "blank"; blank: Blank; parent: LessonFrame; label: string };

/** The frames in order with blank surfaces right after their frame. */
export function runningOrder(lesson: Lesson, blanks: Blank[]): OrderEntry[] {
  return lesson.frames.flatMap((frame): OrderEntry[] => {
    const own = blanks.filter((blank) => blank.afterFrameId === frame.id);
    return [
      { kind: "frame", frame },
      ...own.map((blank, i): OrderEntry => ({
        kind: "blank",
        blank,
        parent: frame,
        label: `${frame.number}${String.fromCharCode(97 + i)}`,
      })),
    ];
  });
}

export const entryId = (entry: OrderEntry) =>
  entry.kind === "frame" ? entry.frame.id : entry.blank.id;

/** An opening image fills its two thirds from edge to edge. */
export const bleedsImage = (frame: LessonFrame) =>
  frame.family === "einstieg" && frame.columns?.[0]?.[0]?.type === "image";
