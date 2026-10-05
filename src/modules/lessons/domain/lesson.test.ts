import { describe, expect, test } from "bun:test";
import lessonJson from "../infrastructure/fixtures/7-2/lesson.json";
import { deviation, formatSeconds, lessonStart, plannedEnd } from "./clock";
import { frameLayout, runningOrder } from "./layout";
import type { Lesson } from "./lesson";
import { newSession, reduceSession, strokeAt } from "./session";

const lesson = lessonJson as Lesson;
const frame = (number: string) => {
  const found = lesson.frames.find((f) => f.number === number);
  if (!found) {
    throw new Error(number);
  }
  return found;
};

describe("layout", () => {
  test("the order in Markdown decides; the system picks the layout", () => {
    expect(lesson.frames.map(frameLayout)).toEqual([
      "spalten", // Impuls: image and text
      "spalten", // Wiederholung: named areas
      "standard", // Beispiel: writing zones
      "standard", // Überblick
      "standard", // Verfahren
      "standard", // Übung
      "merkkarte", // Merksatz
      "quiz",
      "standard", // Anwendung
      "spalten", // Validierung: graph and questions
      "spalten", // Zusammenfassung
      "fokus", // Arbeitsphase: the sheet card
    ]);
  });
});

describe("lesson clock", () => {
  const periods = [
    { number: 2, start: 8 * 60 + 50, end: 9 * 60 + 35 },
    { number: 3, start: 9 * 60 + 50, end: 10 * 60 + 35 },
  ];
  const opened = new Date("2026-10-05T07:00:00");

  test("counts from the start of the current period", () => {
    const { start, period } = lessonStart(
      new Date("2026-10-05T09:56:00"),
      periods,
      opened,
    );
    expect(period?.number).toBe(3);
    expect(start.getHours() * 60 + start.getMinutes()).toBe(9 * 60 + 50);
  });

  test("in a break it refers to the next period", () => {
    expect(
      lessonStart(new Date("2026-10-05T09:40:00"), periods, opened).period
        ?.number,
    ).toBe(3);
  });

  test("outside the timetable it counts from opening", () => {
    expect(
      lessonStart(new Date("2026-10-05T18:00:00"), periods, opened).start,
    ).toBe(opened);
  });

  test("deviation follows the requirements' example", () => {
    // Frame 3, planned 7:00 to 12:00, entered at 8:40, now 10:20: +1:40.
    const value = deviation(lesson, frame("3"), 8 * 60 + 40, 10 * 60 + 20);
    expect(formatSeconds(value, true)).toBe("+1:40");
  });

  test("frames without ::bis keep the previous plan", () => {
    expect(plannedEnd(lesson, frame("1").id)).toBe(240);
  });
});

describe("session", () => {
  const start = newSession(lesson, 0, "s1");
  const at3 = reduceSession(lesson, start, {
    type: "go",
    frameId: frame("5").id,
    now: 100,
  });

  test("a blank hangs after the current frame and is labelled 5a", () => {
    const branched = reduceSession(lesson, at3, { type: "addBlank", now: 120 });
    const order = runningOrder(lesson, branched.blanks);
    const blank = order.find((entry) => entry.kind === "blank");
    expect(blank?.kind === "blank" && blank.label).toBe("5a");
    expect(branched.currentFrameId).toBe(
      blank?.kind === "blank" ? blank.blank.id : "",
    );
    const next = reduceSession(lesson, branched, {
      type: "step",
      by: 1,
      now: 130,
    });
    expect(next.currentFrameId).toBe(frame("6").id);
  });

  test("undo on an empty blank removes it and returns to its frame", () => {
    const branched = reduceSession(lesson, at3, { type: "addBlank", now: 120 });
    const back = reduceSession(lesson, branched, { type: "undo", now: 125 });
    expect(back.blanks).toEqual([]);
    expect(back.currentFrameId).toBe(frame("5").id);
  });

  test("undo takes back the last stroke of the current frame", () => {
    const stroke = {
      id: "k1",
      frameId: frame("5").id,
      color: "graphit" as const,
      points: [[10, 10]] as [number, number][],
    };
    const written = reduceSession(lesson, at3, { type: "stroke", stroke });
    expect(
      reduceSession(lesson, written, { type: "undo", now: 130 }).ink,
    ).toEqual([]);
    expect(strokeAt(written.ink, 15, 12)?.id).toBe("k1");
  });
});
