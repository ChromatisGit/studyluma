import { describe, expect, test } from "bun:test";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
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

describe("components", () => {
  /** A component folder whose index.ts needs no import (a plain definition). */
  const probe = (name = "probe") =>
    `export default {
  name: ${JSON.stringify(name)},
  version: "3",
  placements: ["text"],
  keys: ["wort"],
  graphic: false,
  compile: (file) => ({ wort: file.wort }),
  description: (props) => "Probe " + props.wort,
};
`;
  const withComponent = (files: Record<string, string>) => {
    const dir = instance({
      "math/lineare-funktionen/kapitel-a/p.toml": 'wort = "hallo"\n',
    });
    for (const [path, text] of Object.entries(files)) {
      mkdirSync(dirname(join(dir.root, path)), { recursive: true });
      writeFileSync(join(dir.root, path), text);
    }
    const inhalt = join(
      dir.root,
      "content/math/lineare-funktionen/kapitel-a/inhalt.md",
    );
    writeFileSync(
      inhalt,
      readFileSync(inhalt, "utf8") + "\n::komponente [probe](p.toml)\n",
    );
    return dir;
  };
  const runWith = (dir: ReturnType<typeof instance>, components: unknown) =>
    contribution({
      instanceRoot: dir.root,
      outDir: dir.outDir,
      environment: "local",
      config: { catalog: { courses: ["mathe"] }, components },
    });

  test("loads the activated components and records them in the meta", async () => {
    const dir = withComponent({ "src/components/probe/index.ts": probe() });
    await runWith(dir, { components: ["./src/components/probe"] });
    const meta = JSON.parse(
      readFileSync(join(dir.outDir, "catalog/catalog.meta.json"), "utf8"),
    );
    expect(meta.components).toEqual([{ name: "probe", version: "3" }]);
    expect(JSON.stringify(catalogOf(dir).summaries)).toContain(
      '"title":"Probe hallo"',
    );
    expect(validateCatalogArtifact(join(dir.outDir, "catalog"))).toEqual({
      ok: true,
    });
  });

  test("a component the instance does not activate is unknown", async () => {
    const dir = withComponent({ "src/components/probe/index.ts": probe() });
    await expect(runWith(dir, undefined)).rejects.toThrow(/COMPONENT_UNKNOWN/);
  });

  test("a missing index.ts, a wrong name and a broken definition fail the build", async () => {
    const dir = withComponent({
      "src/components/probe/index.ts": probe("anders"),
      "src/components/kaputt/index.ts": "export default { name: 'kaputt' };\n",
    });
    const failure = runWith(dir, {
      components: [
        "./src/components/probe",
        "./src/components/kaputt",
        "./src/components/fehlt",
      ],
    });
    await expect(failure).rejects.toThrow(/name and folder must match/);
    await expect(failure).rejects.toThrow(
      /kaputt: index.ts must default-export/,
    );
    await expect(failure).rejects.toThrow(/fehlt: index.ts is missing/);
  });

  test("an entry that is not a folder below components/ is refused", async () => {
    const dir = withComponent({});
    await expect(
      runWith(dir, { components: ["../elsewhere/probe"] }),
    ).rejects.toThrow(/not a folder \.\/src\/components\/<name>/);
  });
});
