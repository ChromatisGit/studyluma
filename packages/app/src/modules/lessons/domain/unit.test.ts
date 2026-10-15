import { describe, expect, test } from "bun:test";
import type { Deck, Slide } from "./deck";
import {
  deckState,
  inDetour,
  reduceUnit,
  showDeck,
  startUnit,
  withClock,
} from "./unit";

const slide = (id: string, number: number) => ({ id, number }) as Slide;
const deck = (id: string, ids: string[]): Deck => ({
  id,
  chapterId: "c",
  title: id,
  slides: ids.map((slideId, index) => slide(slideId, index + 1)),
});

const main = deck("main", ["m1", "m2", "m3"]);
const other = deck("other", ["o1", "o2"]);
const started = () =>
  startUnit({
    id: "u1",
    courseId: "kurs",
    presentationId: "main",
    path: "/lesson/main",
    openedAt: 0,
    clock: { startsAt: 1000, periodNumber: 3 },
    sessionCode: "AB34",
  });

describe("unit", () => {
  test("starts on the first slide of the main deck", () => {
    const unit = started();
    expect(unit.mainPresentationId).toBe("main");
    expect(unit.activePresentationId).toBe("main");
    expect(deckState(unit, main).currentFrameId).toBe("m1");
    expect(inDetour(unit)).toBe(false);
  });

  test("a detour keeps the position of the main deck", () => {
    let unit = reduceUnit(started(), main, {
      type: "go",
      frameId: "m2",
      now: 5,
    });
    unit = showDeck(unit, other, "/lesson/other");
    expect(inDetour(unit)).toBe(true);
    expect(deckState(unit, other).currentFrameId).toBe("o1");
    expect(deckState(unit, main).currentFrameId).toBe("m2");
  });

  test("each deck keeps its own position and ink", () => {
    let unit = showDeck(started(), other, "/lesson/other");
    unit = reduceUnit(unit, other, { type: "go", frameId: "o2", now: 9 });
    unit = reduceUnit(unit, other, {
      type: "stroke",
      stroke: { id: "k", frameId: "o2", color: "graphit", points: [[1, 1]] },
    });
    unit = showDeck(unit, main, "/lesson/main");
    expect(inDetour(unit)).toBe(false);
    expect(deckState(unit, main).ink).toEqual([]);
    unit = showDeck(unit, other, "/lesson/other");
    expect(deckState(unit, other).currentFrameId).toBe("o2");
    expect(deckState(unit, other).ink).toHaveLength(1);
  });

  test("an action that changes nothing returns the same unit", () => {
    const unit = showDeck(started(), main, "/lesson/main");
    expect(reduceUnit(unit, main, { type: "go", frameId: "x", now: 1 })).toBe(
      unit,
    );
  });

  test("showing the deck already on the stage changes nothing", () => {
    const unit = showDeck(started(), main, "/lesson/main");
    expect(showDeck(unit, main, "/lesson/main")).toBe(unit);
  });

  test("the unit remembers where to resume", () => {
    const unit = showDeck(started(), other, "/lesson/other?x=1");
    expect(unit.resumePath).toBe("/lesson/other?x=1");
    expect(unit.mainPath).toBe("/lesson/main");
  });

  test("the clock is replaced, not recomputed", () => {
    const unit = withClock(started(), { startsAt: 2000, periodNumber: null });
    expect(unit.clock).toEqual({ startsAt: 2000, periodNumber: null });
    expect(started().clock.periodNumber).toBe(3);
  });
});
