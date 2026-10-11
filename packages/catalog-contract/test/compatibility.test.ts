import { describe, expect, test } from "bun:test";
import {
  CATALOG_FORMAT_VERSION,
  catalogShapeErrors,
  checkCatalogCompatibility,
  computeCatalogBuildId,
  serializeCatalogMeta,
} from "../src";
import { metaOf, tinyCatalog } from "./artifact";

describe("checkCatalogCompatibility", () => {
  test("accepts the current format version", () => {
    expect(checkCatalogCompatibility(metaOf(tinyCatalog()))).toEqual({
      ok: true,
    });
  });

  test("rejects another format version and names both versions", () => {
    const meta = {
      ...metaOf(tinyCatalog()),
      formatVersion: CATALOG_FORMAT_VERSION + 1,
    };
    const result = checkCatalogCompatibility(meta);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain(
        `format version ${CATALOG_FORMAT_VERSION + 1}`,
      );
      expect(result.errors[0]).toContain(
        `reads format version ${CATALOG_FORMAT_VERSION}`,
      );
      expect(result.errors[0]).toContain("test-compiler 1.0.0");
    }
  });

  test.each([
    ["no object", undefined],
    ["a list", []],
    [
      "a missing build id",
      { formatVersion: 1, compiler: { name: "c", version: "1" } },
    ],
    ["a malformed build id", { ...metaOf(tinyCatalog()), buildId: "abc" }],
    ["a fractional version", { ...metaOf(tinyCatalog()), formatVersion: 1.5 }],
    ["a missing compiler", { formatVersion: 1, buildId: "a".repeat(64) }],
  ])("rejects %s", (_name, meta) => {
    const result = checkCatalogCompatibility(meta);
    expect(result.ok).toBe(false);
  });
});

describe("catalog.meta.json", () => {
  test("is deterministic and carries no timestamp", () => {
    const meta = metaOf(tinyCatalog());
    expect(serializeCatalogMeta(meta)).toBe(serializeCatalogMeta({ ...meta }));
    expect(Object.keys(JSON.parse(serializeCatalogMeta(meta)))).toEqual([
      "formatVersion",
      "buildId",
      "compiler",
    ]);
  });
});

describe("computeCatalogBuildId", () => {
  test("is the SHA-256 of the catalog without its build id", () => {
    const { buildId, ...content } = tinyCatalog();
    expect(buildId).toMatch(/^[a-f0-9]{64}$/);
    expect(computeCatalogBuildId(content)).toBe(buildId);
  });
});

describe("catalogShapeErrors", () => {
  test("accepts a valid catalog", () => {
    expect(catalogShapeErrors(tinyCatalog())).toEqual([]);
  });

  test("reports a wrong schema version, build id and missing lists", () => {
    const errors = catalogShapeErrors({ schemaVersion: 7, buildId: "x" });
    expect(errors.join("\n")).toContain("schemaVersion 7");
    expect(errors.join("\n")).toContain("buildId");
    expect(errors.join("\n")).toContain("worksheets must be a list");
    expect(errors.join("\n")).toContain("timetable");
  });

  test("reports duplicate ids and dangling references", () => {
    const catalog = tinyCatalog();
    const [chapter] = catalog.chapters;
    const broken = {
      ...catalog,
      chapters: [{ ...chapter, worksheetIds: ["missing"] }, { ...chapter }],
      courses: [
        {
          id: "k",
          title: "K",
          topics: [{ topicId: "gone", chapterIds: ["c9"] }],
        },
      ],
    };
    const text = catalogShapeErrors(broken).join("\n");
    expect(text).toContain("chapters has the id c1 twice");
    expect(text).not.toContain("worksheetIds");
    const referenced = catalogShapeErrors({
      ...broken,
      chapters: [{ ...chapter, worksheetIds: ["missing"] }],
    }).join("\n");
    expect(referenced).toContain(
      "chapter c1 points to unknown worksheets missing",
    );
    expect(referenced).toContain("course k points to unknown topics gone");
    expect(referenced).toContain("course k points to unknown chapters c9");
  });
});
