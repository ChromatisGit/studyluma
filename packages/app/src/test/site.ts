import { afterAll, beforeAll } from "bun:test";
import {
  CATALOG_FORMAT_VERSION,
  type CatalogArtifactMeta,
} from "@studyluma/catalog-contract";
import { typstToRow } from "../modules/worksheets";
import type { Catalog, Worksheet } from "../modules/catalog";
// Test support may use the catalog module's server file; the index stays free of server code.
// eslint-disable-next-line chromatis/dependencies
import {
  provideCatalogFiles,
  type CatalogFiles,
} from "../modules/catalog/server/catalog.server";
import { catalog, entry, gap, para, part, set, task } from "./catalog";

/** The fixture catalog is written by hand (no compiler), so its build id is a placeholder. */
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

/** An artifact of the fixture catalog, in memory: `catalog.json` plus its meta. */
export function fixtureFiles(
  catalog: Catalog = source,
  meta: Partial<CatalogArtifactMeta> = {},
): CatalogFiles {
  const files: Record<string, string> = {
    "catalog.json": JSON.stringify(catalog),
    "catalog.meta.json": JSON.stringify({
      formatVersion: CATALOG_FORMAT_VERSION,
      buildId: catalog.buildId,
      compiler: { name: "test", version: "0.0.0" },
      ...meta,
    }),
  };
  return {
    read: (path) => {
      const text = files[path];
      return text === undefined ? undefined : new TextEncoder().encode(text);
    },
  };
}

/** Serves the fixture catalog to the server code under test. */
export function serveSiteFixture() {
  beforeAll(() => {
    provideCatalogFiles(fixtureFiles());
  });
  afterAll(() => {
    provideCatalogFiles(undefined);
  });
}
