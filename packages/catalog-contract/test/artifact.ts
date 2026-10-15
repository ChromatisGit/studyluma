import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  CATALOG_FILE,
  CATALOG_FORMAT_VERSION,
  CATALOG_META_FILE,
  computeCatalogBuildId,
  serializeCatalogMeta,
  type Catalog,
  type CatalogArtifactMeta,
} from "../src";

/** A minimal valid catalog, hashed the way the compiler hashes it. */
export function tinyCatalog(
  rest: Partial<Omit<Catalog, "buildId">> = {},
): Catalog {
  const content: Omit<Catalog, "buildId"> = {
    schemaVersion: CATALOG_FORMAT_VERSION,
    timetable: { periods: [{ number: 1, start: 480, end: 525 }] },
    topics: [{ id: "t1", group: "g", folder: "t", title: "Thema" }],
    courses: [
      {
        id: "k",
        title: "Kurs",
        topics: [{ topicId: "t1", chapterIds: ["c1"] }],
      },
    ],
    chapters: [
      {
        id: "c1",
        slug: "n",
        group: "g",
        topic: "t",
        name: "n",
        title: "Kapitel",
        worksheetIds: [],
        quizIds: [],
        foliensatzIds: [],
      },
    ],
    summaries: [],
    worksheets: [],
    challengePools: [],
    quizzes: [],
    foliensaetze: [],
    presentations: [],
    assets: [],
    ...rest,
  };
  return { ...content, buildId: computeCatalogBuildId(content) };
}

export function metaOf(catalog: Catalog): CatalogArtifactMeta {
  return {
    formatVersion: CATALOG_FORMAT_VERSION,
    buildId: catalog.buildId,
    compiler: { name: "test-compiler", version: "1.0.0" },
  };
}

/** Writes an artifact directory; `files` are extra or replacing files by relative path. */
export function writeArtifact(
  catalog: Catalog,
  files: Record<string, string | Uint8Array> = {},
  meta: unknown = metaOf(catalog),
): string {
  const dir = mkdtempSync(join(tmpdir(), "catalog-contract-"));
  const all: Record<string, string | Uint8Array> = {
    [CATALOG_FILE]: JSON.stringify(catalog, null, 2) + "\n",
    [CATALOG_META_FILE]: serializeCatalogMeta(meta as CatalogArtifactMeta),
    ...files,
  };
  for (const [name, content] of Object.entries(all)) {
    mkdirSync(dirname(join(dir, name)), { recursive: true });
    writeFileSync(join(dir, name), content);
  }
  return dir;
}
