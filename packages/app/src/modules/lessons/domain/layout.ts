import type { SlideSegment } from "../../catalog";
import type { Deck, Slide } from "./deck";
import type { Blank } from "./lesson";

/**
 * The order in the Markdown is the order on the slide. Beyond that only
 * the kind of entry decides how a slide is built.
 */
export type SlideLayout = "slide" | "sheet" | "quiz" | "merkkarte" | "summary";

export const slideLayout = (slide: Slide): SlideLayout =>
  slide.kind === "slide"
    ? "slide"
    : slide.kind === "worksheet"
      ? "sheet"
      : slide.kind;

/** The columns of a slide share the width the author chose. */
export function columnWidths(
  columns: Extract<SlideSegment, { type: "columns" }>["columns"],
): string {
  return columns.map((column) => `${column.width}fr`).join(" ");
}

/** An entry in the running order: a planned slide or a blank surface. */
export type OrderEntry =
  | { kind: "slide"; slide: Slide }
  | { kind: "blank"; blank: Blank; parent: Slide; label: string };

/** The slides in order with blank surfaces right after their slide. */
export function runningOrder(deck: Deck, blanks: Blank[]): OrderEntry[] {
  return deck.slides.flatMap((slide): OrderEntry[] => {
    const own = blanks.filter((blank) => blank.afterFrameId === slide.id);
    return [
      { kind: "slide", slide },
      ...own.map((blank, i): OrderEntry => ({
        kind: "blank",
        blank,
        parent: slide,
        label: `${slide.number}${String.fromCharCode(97 + i)}`,
      })),
    ];
  });
}

export const entryId = (entry: OrderEntry) =>
  entry.kind === "slide" ? entry.slide.id : entry.blank.id;

export const entrySlide = (entry: OrderEntry) =>
  entry.kind === "slide" ? entry.slide : entry.parent;

/** The segment that is only a full-bleed image fills its place on the slide. */
export function isFill(segment: SlideSegment): boolean {
  if (segment.type !== "content") {
    return false;
  }
  const nodes = segment.content;
  return (
    nodes.length > 0 &&
    nodes.every(
      (node) =>
        node.type === "paragraph" &&
        node.children.length > 0 &&
        node.children.every(
          (child) =>
            child.type === "image" ||
            (child.type === "text" && !child.value.trim()),
        ) &&
        node.children.some(
          (child) => child.type === "image" && child.fit === "cover",
        ),
    )
  );
}
