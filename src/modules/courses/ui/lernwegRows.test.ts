import { describe, expect, test } from "bun:test";
import { lernwegRows, type LernwegPhase } from "./lernwegRows";

const topic = (id: string, chapters: string[]) => ({
  id,
  number: id,
  title: id,
  chapters: chapters.map((chapter) => ({
    id: chapter,
    number: chapter,
    title: chapter,
    to: `/${chapter}`,
  })),
});

const phases: LernwegPhase[] = [
  {
    id: "y1",
    label: "Jahr 1",
    topics: [topic("1", ["1.1"]), topic("2", ["2.1"])],
  },
  {
    id: "y2",
    label: "Jahr 2",
    topics: [
      topic("3", ["3.1", "3.2"]),
      topic("4", ["4.1"]),
      topic("5", ["5.1"]),
    ],
  },
];

describe("lernwegRows", () => {
  test("the current topic opens with the class position on its chapter", () => {
    const { rows, hereIndex } = lernwegRows(phases, 1, "3.2", "3");
    expect(rows.map((row) => row.key)).toEqual([
      "previous",
      "3",
      "3.1",
      "3.2",
      "4",
      "5",
    ]);
    expect(hereIndex).toBe(3);
    const chapters = rows.filter((row) => row.kind === "chapter");
    expect(chapters.map((row) => row.status)).toEqual(["done", "here"]);
  });

  test("only the next upcoming topic can be opened", () => {
    const { rows } = lernwegRows(phases, 1, "3.2", null);
    const openable = rows.flatMap((row) =>
      row.kind === "topic" ? [row.openable] : [],
    );
    expect(openable).toEqual([true, true, false]);
  });

  test("a past year links to the next one and is fully travelled", () => {
    const { rows, hereIndex } = lernwegRows(phases, 0, "3.2", null);
    expect(rows.at(-1)?.key).toBe("next");
    expect(hereIndex).toBe(Number.POSITIVE_INFINITY);
  });
});
