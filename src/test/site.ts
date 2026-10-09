import { afterAll, beforeAll } from "bun:test";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { typstToRow } from "../modules/worksheets";
import type { Worksheet } from "../modules/catalog";
import { catalog, entry, gap, para, part, set, task } from "./catalog";

export const buildId = "c".repeat(64);
const einsetzen = part("p-gap", "Einsetzen", {
  content: [
    {
      type: "paragraph",
      children: [
        gap("g1", "Wort"),
        gap("g2", "richtig", { choices: ["richtig", "falsch", "auch falsch"] }),
        gap("g3", "1/3", { math: true }),
      ],
    },
  ],
});
const antwort = part("p-answer", "Antwort", {
  answer: { exact: "4 x^3", checkRow: typstToRow("4 x^3") },
  markers: {
    loesung: para("4x^3"),
    fehler: [{ answer: "4 x^4", feedback: "Exponent?" }],
    tipp: [
      {
        type: "paragraph",
        children: [{ type: "merkkarteRef", targetId: "m1", title: "Regel" }],
      },
    ],
  },
  steps: {
    level: 1,
    kind: "rechenweg",
    items: [{ id: "st1", content: [gap("sg", "3", { math: true })] }],
  },
});
const auswahl = part("p-choice", "Auswahl", {
  options: [
    { content: [], correct: true },
    { content: [], correct: false },
  ],
});
const setAnswer = part("p-set", "Antwort", {
  answer: {
    exact: "{1, 5}",
    kind: "set",
    elements: [
      { exact: "1", checkRow: typstToRow("1") },
      { exact: "5", checkRow: typstToRow("5") },
    ],
  },
});
const sheet: Worksheet = {
  id: "w1",
  chapterId: "c1",
  filename: "w",
  title: "Blatt",
  chooseMode: true,
  sections: [
    {
      id: "s",
      checkpoint: false,
      title: "Aufgaben",
      items: [
        { type: "task", task: task("t1", [einsetzen]) },
        { type: "task", task: task("t2", [antwort]) },
        { type: "task", task: task("t3", [auswahl]) },
        { type: "task", task: task("t4", [setAnswer]) },
      ],
    },
  ],
};
export const source = catalog({
  buildId,
  chapters: [
    {
      id: "c1",
      group: "g",
      topic: "t",
      name: "n",
      title: "Kapitel",
      worksheetIds: ["w1"],
      quizIds: ["q1"],
      foliensatzIds: [],
    },
  ],
  summaries: [
    {
      id: "s1",
      chapterId: "c1",
      title: "Inhalt",
      content: [{ type: "content", content: para("Geheim") }],
      merkkarten: [
        {
          id: "m1",
          title: "Regel",
          anchor: "regel",
          rule: para("Regel"),
          examples: [],
        },
      ],
    },
  ],
  worksheets: [sheet],
  quizzes: [
    {
      id: "q1",
      chapterId: "c1",
      filename: "q",
      title: "Quiz",
      questions: [
        {
          id: "qq",
          prompt: [],
          multiple: false,
          options: [
            { content: [], correct: true },
            { content: [], correct: false },
          ],
        },
      ],
    },
  ],
  foliensaetze: [
    set("f1", "Satz", [entry("e1", "slide", { notes: para("privat") })]),
  ],
});

/** Serves the fixture catalog to the server code under test. */
export function serveSiteFixture() {
  let previous: string | undefined;
  beforeAll(() => {
    const root = mkdtempSync(join(tmpdir(), "studyluma-site-"));
    const dir = join(root, buildId);
    mkdirSync(dir);
    writeFileSync(join(dir, "catalog.json"), JSON.stringify(source));
    previous = process.env.STUDYLUMA_BUNDLE_DIR;
    process.env.STUDYLUMA_BUNDLE_DIR = dir;
  });
  afterAll(() => {
    if (previous === undefined) {
      delete process.env.STUDYLUMA_BUNDLE_DIR;
    } else {
      process.env.STUDYLUMA_BUNDLE_DIR = previous;
    }
  });
}
