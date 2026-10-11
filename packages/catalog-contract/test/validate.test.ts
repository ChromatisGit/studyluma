import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { rmSync } from "node:fs";
import { join } from "node:path";
import {
  CATALOG_FORMAT_VERSION,
  computeCatalogBuildId,
  validateCatalogArtifact,
} from "../src";
import { metaOf, tinyCatalog, writeArtifact } from "./artifact";

const errorsOf = (dir: string) => {
  const result = validateCatalogArtifact(dir);
  return result.ok ? [] : result.errors;
};

describe("validateCatalogArtifact", () => {
  test("accepts a complete artifact", () => {
    expect(validateCatalogArtifact(writeArtifact(tinyCatalog()))).toEqual({
      ok: true,
    });
  });

  test("fails for a missing directory", () => {
    expect(errorsOf("/nonexistent/catalog")[0]).toContain("does not exist");
  });

  test("fails when catalog.meta.json is missing", () => {
    const dir = writeArtifact(tinyCatalog());
    rmSync(join(dir, "catalog.meta.json"));
    expect(errorsOf(dir)[0]).toContain("catalog.meta.json is missing");
  });

  test("fails for another format version", () => {
    const catalog = tinyCatalog();
    const dir = writeArtifact(
      catalog,
      {},
      {
        ...metaOf(catalog),
        formatVersion: CATALOG_FORMAT_VERSION + 1,
      },
    );
    expect(errorsOf(dir)[0]).toContain("Rebuild the catalog");
  });

  test("fails when catalog.json is not JSON", () => {
    const dir = writeArtifact(tinyCatalog(), { "catalog.json": "{" });
    expect(errorsOf(dir)[0]).toContain("catalog.json is not valid JSON");
  });

  test("fails when meta and catalog name different builds", () => {
    const catalog = tinyCatalog();
    const other = tinyCatalog({ topics: [], courses: [] });
    const dir = writeArtifact(catalog, {}, metaOf(other));
    expect(errorsOf(dir).join("\n")).toContain("says build");
  });

  test("fails when the catalog was edited after the build", () => {
    const catalog = tinyCatalog();
    const edited = {
      ...catalog,
      topics: [{ ...catalog.topics[0], title: "Anders" }],
    };
    const dir = writeArtifact(catalog, {
      "catalog.json": JSON.stringify(edited),
    });
    expect(errorsOf(dir).join("\n")).toContain("does not match its build id");
  });

  test("checks asset files for presence, size and digest", () => {
    const bytes = new TextEncoder().encode("<svg/>");
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    const path = `assets/${sha256}.svg`;
    const asset = (byteLength: number) => ({
      id: "a1",
      path,
      mimeType: "image/svg+xml",
      sha256,
      byteLength,
    });
    const ok = tinyCatalog({ assets: [asset(bytes.byteLength)] });
    expect(
      validateCatalogArtifact(writeArtifact(ok, { [path]: bytes })),
    ).toEqual({ ok: true });
    expect(errorsOf(writeArtifact(ok, {}))[0]).toContain("is missing");
    expect(
      errorsOf(writeArtifact(ok, { [path]: "<svg>other</svg>" }))[0],
    ).toContain("wrong size");
    expect(errorsOf(writeArtifact(ok, { [path]: "<svg?>" }))[0]).toContain(
      "does not match its digest",
    );
    const wrongPath = tinyCatalog({
      assets: [{ ...asset(6), path: "../escape.svg" }],
    });
    expect(errorsOf(writeArtifact(wrongPath))[0]).toContain("invalid path");
  });

  test("a rehashed catalog with a dangling reference is rejected", () => {
    const base = tinyCatalog();
    const { buildId: _unused, ...content } = base;
    const broken = {
      ...content,
      courses: [
        {
          id: "k",
          title: "K",
          topics: [{ topicId: "t1", chapterIds: ["zz"] }],
        },
      ],
    };
    const catalog = { ...broken, buildId: computeCatalogBuildId(broken) };
    expect(errorsOf(writeArtifact(catalog)).join("\n")).toContain(
      "unknown chapters zz",
    );
  });
});
