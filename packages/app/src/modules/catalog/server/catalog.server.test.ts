/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { describe, expect, test } from "bun:test";
import { CATALOG_FORMAT_VERSION } from "@studyluma/catalog-contract";
import { fixtureFiles, serveSiteFixture, source } from "../../../test/site";
import type { PublicCatalog } from "../domain/types";
import {
  assetBytes,
  catalogIndex,
  getCatalog,
  loadCatalog,
  nothingReleased,
  provideCatalogFiles,
  publicCatalog as releasedCatalog,
  teacherCatalog,
  verifyCatalog,
} from "./catalog.server";

serveSiteFixture();
const publicCatalog = () => releasedCatalog(nothingReleased, ["c1"]);

const parts = (c: PublicCatalog) =>
  c.worksheets[0]!.sections[0]!.items.flatMap((item) =>
    item.type === "task"
      ? item.task.items.flatMap((i) => (i.type === "part" ? [i.part] : []))
      : [],
  );

describe("the catalog for the teacher", () => {
  test("keeps answers and notes, and tells the fields their kind", () => {
    const site = teacherCatalog(["c1"]);
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

  test("no private field survives anywhere in the structure", () => {
    // Redaction deletes named fields; this fails when a new private field
    // slips past it, whatever the fixture's wording.
    const PRIVATE = [
      "answer",
      "answers",
      "correct",
      "fehler",
      "notes",
      "loesung",
    ];
    const found: string[] = [];
    const walk = (value: unknown, path: string) => {
      if (Array.isArray(value)) {
        value.forEach((item, i) => walk(item, `${path}[${i}]`));
      } else if (value && typeof value === "object") {
        for (const [key, child] of Object.entries(value)) {
          if (PRIVATE.includes(key)) {
            found.push(`${path}.${key}`);
          }
          walk(child, `${path}.${key}`);
        }
      }
    };
    walk(publicCatalog(), "catalog");
    expect(found).toEqual([]);
    // The check can tell: the teacher's catalog does carry them.
    walk(teacherCatalog(["c1"]), "teacher");
    expect(found.length).toBeGreaterThan(0);
  });

  test("gaps keep their kind and the compiler's order of choices", () => {
    const [gaps] = parts(publicCatalog());
    const kinds = (
      gaps!.content[0] as {
        children: { inputKind: string; choices: { value: string }[] }[];
      }
    ).children;
    expect(kinds.map((g) => g.inputKind)).toEqual(["text", "dropdown", "math"]);
    expect(kinds[1]?.choices.map((choice) => choice.value)).toEqual([
      "richtig",
      "falsch",
      "auch falsch",
    ]);
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
    const site = releasedCatalog(
      {
        summary: (id) => id === "c1",
        solution: (id) => id === "t2",
      },
      ["c1"],
    );
    expect(site.summaries[0]?.content).toHaveLength(1);
    expect(parts(site)[1]?.markers.loesung).toBeDefined();
  });
});

describe("the catalog of a page's chapters", () => {
  test("carries only those chapters' content, the shared parts whole", () => {
    const none = releasedCatalog(nothingReleased, []);
    expect(none.worksheets).toEqual([]);
    expect(none.summaries).toEqual([]);
    expect(none.quizzes).toEqual([]);
    expect(none.foliensaetze).toEqual([]);
    expect(none.tipCards).toEqual({});
    expect(none.chapters.map((chapter) => chapter.id)).toEqual(["c1"]);
    expect(teacherCatalog([]).worksheets).toEqual([]);
  });

  test("is worked out once per reader, chapters and what of them is released", () => {
    const released = (solution: string) => ({
      summary: () => false,
      solution: (id: string) => id === solution,
    });
    expect(releasedCatalog(nothingReleased, ["c1"])).toBe(publicCatalog());
    expect(releasedCatalog(released("elsewhere"), ["c1"])).toBe(
      publicCatalog(),
    );
    expect(releasedCatalog(released("t2"), ["c1"])).not.toBe(publicCatalog());
    expect(teacherCatalog(["c1"])).toBe(teacherCatalog(["c1"]));
    expect(teacherCatalog(["c1"])).not.toBe(publicCatalog());
  });

  test("the index names every chapter's sheets and Merkkarten", () => {
    expect(catalogIndex()).toMatchObject({
      buildId: source.buildId,
      summaryTitles: { c1: "Inhalt" },
      merkkarten: [{ id: "m1", anchor: "regel", chapterId: "c1" }],
      worksheets: { c1: [{ id: "w1", slug: "blatt" }] },
    });
  });
});

describe("loading the catalog the build supplied", () => {
  test("reads the artifact it was given", () => {
    expect(loadCatalog(fixtureFiles()).buildId).toBe(source.buildId);
    expect(getCatalog().buildId).toBe(source.buildId);
    expect(() => verifyCatalog()).not.toThrow();
  });

  test("without a catalog.meta.json it says how to build one", () => {
    const files = fixtureFiles();
    expect(() =>
      loadCatalog({
        read: (path) =>
          path === "catalog.meta.json" ? undefined : files.read(path),
      }),
    ).toThrow(
      /catalog\.meta\.json is missing; build the catalog with @studyluma\/compiler/,
    );
  });

  test("another format version fails with a message naming both versions", () => {
    const files = fixtureFiles(source, {
      formatVersion: CATALOG_FORMAT_VERSION + 1,
    });
    expect(() => loadCatalog(files)).toThrow(
      new RegExp(
        `format version ${CATALOG_FORMAT_VERSION + 1}.*reads format version ${CATALOG_FORMAT_VERSION}`,
      ),
    );
  });

  test("a catalog that is not the build named in the meta is refused", () => {
    expect(() =>
      loadCatalog(fixtureFiles(source, { buildId: "d".repeat(64) })),
    ).toThrow(/names another build/);
  });

  test("a catalog using a component the build does not activate is refused", () => {
    const files = fixtureFiles(source, {
      components: [{ name: "symmetrie", version: "1" }],
    });
    expect(() => loadCatalog(files)).toThrow(
      /uses the component symmetrie.*config\/components\.toml/,
    );
    expect(loadCatalog(files, ["symmetrie"]).buildId).toBe(source.buildId);
  });

  test("a malformed catalog is refused with what is wrong", () => {
    const broken = {
      ...source,
      worksheets: undefined,
    } as unknown as typeof source;
    expect(() => loadCatalog(fixtureFiles(broken))).toThrow(
      /worksheets must be a list/,
    );
  });

  test("nothing is embedded outside a build: no catalog, no guessing", () => {
    provideCatalogFiles(undefined);
    try {
      expect(() => getCatalog()).toThrow(/embeds no catalog/);
      expect(() => verifyCatalog()).toThrow(/embeds no catalog/);
    } finally {
      provideCatalogFiles(fixtureFiles());
    }
  });

  test("assets come from the artifact", () => {
    const id = "a".repeat(64);
    const catalog = {
      ...source,
      assets: [
        {
          id: "a1",
          path: `assets/${id}.png`,
          mimeType: "image/png",
          sha256: id,
          byteLength: 3,
        },
      ],
    };
    const base = fixtureFiles(catalog);
    provideCatalogFiles({
      read: (path) =>
        path === `assets/${id}.png`
          ? new Uint8Array([1, 2, 3])
          : base.read(path),
    });
    try {
      expect(assetBytes("a1")?.bytes).toEqual(new Uint8Array([1, 2, 3]));
      expect(assetBytes("a1")?.mimeType).toBe("image/png");
      expect(assetBytes("unknown")).toBeUndefined();
    } finally {
      provideCatalogFiles(fixtureFiles());
    }
  });
});
