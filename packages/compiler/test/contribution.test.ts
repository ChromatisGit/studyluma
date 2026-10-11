import { describe, expect, test } from "bun:test";
import { cpSync, existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  validateCatalogArtifact,
  type Catalog,
} from "@studyluma/catalog-contract";
import contribution from "../src/contribution";
import { makeContent } from "./fixture";

const second =
  'titel = "Zweiter Kurs"\n\n[themen]\nlineare-funktionen = ["kapitel-a"]\n';

/** An instance directory whose `content/` holds the representative content. */
function instance(extra: Record<string, string> = {}) {
  const root = mkdtempSync(join(tmpdir(), "studyluma-instance-"));
  cpSync(makeContent(extra), join(root, "content"), { recursive: true });
  return { root, outDir: join(root, ".chromatis/artifacts") };
}

function run({ root, outDir }: ReturnType<typeof instance>, catalog: unknown) {
  return contribution({
    instanceRoot: root,
    outDir,
    environment: "local",
    config: catalog === undefined ? {} : { catalog },
  });
}

const catalogOf = ({ outDir }: { outDir: string }) =>
  JSON.parse(
    readFileSync(join(outDir, "catalog/catalog.json"), "utf8"),
  ) as Catalog;

describe("catalog build contribution", () => {
  test("writes a valid catalog artifact into <outDir>/catalog", async () => {
    const dir = instance();
    await run(dir, { content: "content", courses: ["mathe"] });
    expect(validateCatalogArtifact(join(dir.outDir, "catalog"))).toEqual({
      ok: true,
    });
    expect(existsSync(join(dir.outDir, "catalog/catalog.meta.json"))).toBe(
      true,
    );
    expect(catalogOf(dir).courses.map((course) => course.id)).toEqual([
      "mathe",
    ]);
  });

  test("the content root defaults to content", async () => {
    const dir = instance();
    await run(dir, { courses: ["mathe"] });
    expect(validateCatalogArtifact(join(dir.outDir, "catalog")).ok).toBe(true);
  });

  test("publishes exactly the listed courses and never reads the others", async () => {
    const dir = instance({
      "kurse/zweiter.toml": second,
      "kurse/kaputt.toml": "titel = [unclosed",
    });
    await run(dir, { content: "content", courses: ["zweiter", "mathe"] });
    expect(
      catalogOf(dir)
        .courses.map((course) => course.id)
        .sort(),
    ).toEqual(["mathe", "zweiter"]);
    expect(validateCatalogArtifact(join(dir.outDir, "catalog")).ok).toBe(true);
  });

  test("the result is deterministic", async () => {
    const dir = instance();
    await run(dir, { courses: ["mathe"] });
    const first = catalogOf(dir).buildId;
    await run(dir, { courses: ["mathe"] });
    expect(catalogOf(dir).buildId).toBe(first);
  });

  test("a published course without a course file fails the build", async () => {
    const dir = instance();
    await expect(run(dir, { courses: ["mathe", "fehlt"] })).rejects.toThrow(
      /COURSE_UNKNOWN.*fehlt/,
    );
  });

  test("content that does not compile fails with its diagnostics", async () => {
    const dir = instance({ "math/lineare-funktionen/kapitel-a/inhalt.md": "" });
    await expect(run(dir, { courses: ["mathe"] })).rejects.toThrow(
      /content does not compile/,
    );
  });

  test("missing or malformed configuration fails clearly", async () => {
    const dir = instance();
    await expect(run(dir, undefined)).rejects.toThrow(/config\/catalog\.toml/);
    await expect(run(dir, { content: "content" })).rejects.toThrow(
      /courses must list/,
    );
    await expect(run(dir, { courses: [] })).rejects.toThrow(
      /courses must list/,
    );
    await expect(
      run(dir, { content: "../elsewhere", courses: ["mathe"] }),
    ).rejects.toThrow(/inside the instance/);
    await expect(
      run(dir, { content: "/etc", courses: ["mathe"] }),
    ).rejects.toThrow(/inside the instance/);
  });
});
