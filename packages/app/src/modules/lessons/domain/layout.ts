import type { Phase } from "../../classroom";
import type { RichNode, SlideSegment } from "../../catalog";
import type { Deck, Slide } from "./deck";
import type { Blank } from "./lesson";

/**
 * The order in the Markdown is the order on the slide. Beyond that only
 * the kind of entry decides how a slide is built.
 */
export type SlideLayout = "slide" | "sheet" | "quiz" | "summary";

export const slideLayout = (slide: Slide): SlideLayout =>
  slide.kind === "worksheet"
    ? "sheet"
    : slide.kind === "quiz" || slide.kind === "summary"
      ? slide.kind
      : "slide";

/**
 * A tab's color says what happens on the slide: green means the students
 * act, orange is the essence of the lesson.
 */
export type TabTone = "standard" | "merke" | "arbeit" | "quiz";

/**
 * The tab of a slide: embedded entries carry a fixed function, author
 * slides their `::tag`, an untagged slide is `Plenum`.
 */
export function slideTab(slide: Slide): { label: string; tone: TabTone } {
  switch (slide.kind) {
    case "worksheet":
      return { label: "Arbeitsblatt", tone: "arbeit" };
    case "quiz":
      return { label: "Quiz", tone: "quiz" };
    case "summary":
      return { label: "Inhalt", tone: "standard" };
    case "merkkarte":
      return { label: "Merkkarte", tone: "standard" };
    case "slide": {
      const label = slide.tag ?? "Plenum";
      return {
        label,
        tone:
          label === "Merke"
            ? "merke"
            : label === "Aufgabe" || label === "Austausch"
              ? "arbeit"
              : "standard",
      };
    }
  }
}

/**
 * What the students' devices show while this slide is up front. Only the
 * green slides change it; a quiz takes over on its own once it runs.
 */
export function slidePhase(slide: Slide): Phase {
  if (slide.kind === "worksheet") {
    return "arbeitsblatt";
  }
  if (slide.kind !== "slide") {
    return "unterricht";
  }
  return slide.tag === "Aufgabe"
    ? "aufgabe"
    : slide.tag === "Austausch"
      ? "austausch"
      : "unterricht";
}

const hasSpace = (nodes: RichNode[]) =>
  nodes.some((node) => node.type === "space");

/** A slide with `::platz` keeps its text compact; the rest of it is for writing. */
export const isWritingSlide = (slide: Slide): boolean =>
  slide.segments.some((segment) =>
    segment.type === "content"
      ? hasSpace(segment.content)
      : segment.columns.some((column) => hasSpace(column.content)),
  );

/**
 * The columns of a slide share the width the author chose. The factors add
 * up to 100: fractions that add up to less than 1 would leave part of the
 * width unused as soon as one column is as wide as its content.
 */
export function columnWidths(
  columns: Extract<SlideSegment, { type: "columns" }>["columns"],
): string {
  return columns
    .map((column) => `minmax(0, ${column.width * 100}fr)`)
    .join(" ");
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
