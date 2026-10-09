/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "bun:test";
import { serveSiteFixture } from "../../../test/site";
import type { PublicCatalog } from "../domain/types";
import {
  nothingReleased,
  publicCatalog as releasedCatalog,
  teacherCatalog,
} from "./catalog.server";

serveSiteFixture();
const publicCatalog = () => releasedCatalog(nothingReleased);

const parts = (c: PublicCatalog) =>
  c.worksheets[0]!.sections[0]!.items.flatMap((item) =>
    item.type === "task"
      ? item.task.items.flatMap((i) => (i.type === "part" ? [i.part] : []))
      : [],
  );

describe("the catalog for the teacher", () => {
  test("keeps answers and notes, and tells the fields their kind", () => {
    const site = teacherCatalog();
    const [, answer, , setPart] = parts(site);
    expect(answer?.answer?.exact).toBe("4 x^3");
    expect(answer?.variable).toBe("x");
    expect(setPart?.answerKind).toBe("set");
    expect(setPart?.answer?.kind).toBe("set");
    expect(JSON.stringify(site)).toContain("privat");
    expect(site.tipCards.m1?.title).toBe("Regel");
  });
});

describe("the catalog for browsers", () => {
  test("answers, correct options, notes and unreleased text never leave the server", () => {
    const text = JSON.stringify(publicCatalog());
    const [gaps, answer, choice] = parts(publicCatalog());
    expect(answer?.answer).toBeUndefined();
    expect(answer?.markers.loesung).toBeUndefined();
    expect(answer?.markers.fehler).toBeUndefined();
    expect(
      choice?.options?.every((option) => option.correct === undefined),
    ).toBe(true);
    expect(text).not.toContain("privat");
    expect(text).not.toContain("Geheim");
    expect(text).not.toContain('"checkRow"');
    expect(text).not.toContain('"correct"');
    expect(JSON.stringify(gaps)).not.toContain("exact");
  });

  test("gaps keep their kind and a neutral order of choices", () => {
    const [gaps] = parts(publicCatalog());
    const kinds = (
      gaps!.content[0] as {
        children: { inputKind: string; choices: string[] }[];
      }
    ).children;
    expect(kinds.map((g) => g.inputKind)).toEqual(["text", "dropdown", "math"]);
    expect(kinds[1]?.choices).toEqual(["auch falsch", "falsch", "richtig"]);
  });

  test("a set or vector answer tells the field what it is, not what it contains", () => {
    const [, , , setPart] = parts(publicCatalog());
    expect(setPart?.answerKind).toBe("set");
    expect(setPart?.variable).toBeUndefined();
    expect(JSON.stringify(setPart)).not.toContain("elements");
  });

  test("the keypad learns the variable, steps keep their gaps", () => {
    const [, answer] = parts(publicCatalog());
    expect(answer?.variable).toBe("x");
    expect(JSON.stringify(answer?.steps)).toContain("inputKind");
  });

  test("tips keep their Merkkarte while the Inhalt is locked", () => {
    const site = publicCatalog();
    expect(site.tipCards.m1?.title).toBe("Regel");
    expect(site.summaries[0]?.content).toEqual([]);
    expect(site.summaries[0]?.merkkarten[0]?.rule).toEqual([]);
  });

  test("releasing shows the solution and the Inhalt", () => {
    const site = releasedCatalog({
      summary: (id) => id === "c1",
      solution: (id) => id === "t2",
    });
    expect(site.summaries[0]?.content).toHaveLength(1);
    expect(parts(site)[1]?.markers.loesung).toBeDefined();
  });
});
