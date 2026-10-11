import { afterAll, describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { manifestSchema } from "@chromatis/base/module";
import {
  MANIFEST_FILE,
  buildManifest,
  discoverModules,
  manifestProblems,
  writeManifest,
} from "./generate-manifest";

const packageRoot = resolve(import.meta.dir, "..");
// Below node_modules (git-ignored) so the fixture modules resolve @chromatis/base.
const sandbox = join(packageRoot, "node_modules", ".manifest-test");
mkdirSync(sandbox, { recursive: true });
afterAll(() => rmSync(sandbox, { recursive: true, force: true }));

const declare = (body: string) =>
  `import { defineModule } from "@chromatis/base/module";\nexport default defineModule({ ${body} });\n`;

/** A package with the given `src/modules/<dir>/<file>` contents. */
function fixture(files: Record<string, string>): string {
  const root = mkdtempSync(join(sandbox, "package-"));
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

describe("this package", () => {
  test("lists exactly the module directories that hold a module.ts, sorted", async () => {
    const found = readdirSync(join(packageRoot, "src/modules"), {
      withFileTypes: true,
    })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((name) =>
        existsSync(join(packageRoot, "src/modules", name, "module.ts")),
      )
      .sort();
    expect(discoverModules(packageRoot)).toEqual(found);
    const manifest = manifestSchema.parse(
      JSON.parse(await buildManifest(packageRoot)),
    );
    expect(manifest.modules.map((module) => module.name)).toEqual(found);
    expect(manifest.modules.map((module) => module.entry)).toEqual(
      found.map((name) => `../src/modules/${name}/module.ts`),
    );
  });

  test("is deterministic", async () => {
    expect(await buildManifest(packageRoot)).toBe(
      await buildManifest(packageRoot),
    );
  });

  test("declares the catalog build and the classroom runtime", async () => {
    const { modules } = manifestSchema.parse(
      JSON.parse(await buildManifest(packageRoot)),
    );
    const byName = Object.fromEntries(modules.map((m) => [m.name, m]));
    expect(byName.catalog?.contributions.map((c) => c.id)).toEqual(["catalog"]);
    expect(byName.catalog?.artifacts.map((a) => a.path)).toEqual(["catalog"]);
    expect(byName.classroom?.runtime).toEqual(["classroom"]);
    expect(byName.classroom?.serverHook).toBe("server/hook.ts");
  });
});

describe("discovery", () => {
  test("ignores directories without a module.ts and sorts the rest", async () => {
    const root = fixture({
      "src/modules/zeta/module.ts": declare('name: "zeta"'),
      "src/modules/alpha/module.ts": declare('name: "alpha"'),
      "src/modules/plain/index.ts": "export {};\n",
      "src/modules/loose-file.ts": "export {};\n",
    });
    expect(discoverModules(root)).toEqual(["alpha", "zeta"]);
    const manifest = JSON.parse(await buildManifest(root, {}));
    expect(manifest.modules.map((m: { name: string }) => m.name)).toEqual([
      "alpha",
      "zeta",
    ]);
  });

  test("a module that declares another name than its directory fails", async () => {
    const root = fixture({
      "src/modules/alpha/module.ts": declare('name: "beta"'),
    });
    await expect(buildManifest(root, {})).rejects.toThrow(
      /declares name "beta" but the directory is "alpha"/,
    );
  });

  test("an invalid declaration or a missing server hook fails with every problem", async () => {
    const root = fixture({
      "src/modules/alpha/module.ts": "export default { name: 1 };\n",
      "src/modules/beta/module.ts": declare(
        'name: "beta", runtime: ["beta"], serverHook: "server/hook.ts"',
      ),
    });
    const error = await buildManifest(root, {}).catch((e: Error) => e.message);
    expect(error).toContain(
      "alpha/module.ts: must default export defineModule",
    );
    expect(error).toContain(
      "beta/module.ts: serverHook server/hook.ts does not exist",
    );
  });
});

describe("routes", () => {
  test("module and package routes are written, missing files are reported", async () => {
    const root = fixture({
      "src/modules/alpha/module.ts": declare(
        'name: "alpha", routes: [{ path: "a", file: "./r.tsx" }, { path: "b", file: "./gone.tsx" }]',
      ),
      "src/modules/alpha/r.tsx": "export default null;\n",
      "app/home.tsx": "export default null;\n",
    });
    const error = await buildManifest(root, {
      root: "../app/home.tsx",
      routes: [{ index: true, file: "../app/nope.tsx" }],
    }).catch((e: Error) => e.message);
    expect(error).toContain(
      "alpha/module.ts routes: ./gone.tsx does not exist",
    );
    expect(error).toContain(
      "scripts/routes.ts: ../app/nope.tsx does not exist",
    );
    expect(error).not.toContain("r.tsx does not exist");
    expect(error).not.toContain("home.tsx does not exist");

    const manifest = JSON.parse(
      await buildManifest(
        fixture({
          "src/modules/alpha/module.ts": declare(
            'name: "alpha", routes: [{ path: "a", file: "./r.tsx" }]',
          ),
          "src/modules/alpha/r.tsx": "export default null;\n",
          "app/home.tsx": "export default null;\n",
        }),
        {
          root: "../app/home.tsx",
          routes: [{ index: true, file: "../app/home.tsx" }],
        },
      ),
    );
    expect(manifest.app.routes).toEqual([
      { index: true, file: "../app/home.tsx" },
    ]);
    expect(manifest.modules[0].routes).toEqual([
      { path: "a", file: "./r.tsx" },
    ]);
  });
});

describe("staleness", () => {
  const modules = (extra: Record<string, string> = {}) =>
    fixture({
      "src/modules/alpha/module.ts": declare('name: "alpha"'),
      ...extra,
    });

  test("a missing manifest is reported, a current one is accepted", async () => {
    const root = modules();
    expect(await manifestProblems(root, {})).toEqual([
      expect.stringContaining("is missing"),
    ]);

    await writeManifest(root, {});
    expect(await manifestProblems(root, {})).toEqual([]);
  });

  test("a new module makes the manifest stale", async () => {
    const root = modules();
    await writeManifest(root, {});
    mkdirSync(join(root, "src/modules/beta"));
    writeFileSync(
      join(root, "src/modules/beta/module.ts"),
      declare('name: "beta"'),
    );
    expect(await manifestProblems(root, {})).toEqual([
      expect.stringContaining("stale or edited by hand"),
    ]);
    await writeManifest(root, {});
    expect(await manifestProblems(root, {})).toEqual([]);
  });

  test("a hand edit is detected", async () => {
    const root = modules();
    await writeManifest(root, {});
    const file = join(root, MANIFEST_FILE);
    writeFileSync(
      file,
      readFileSync(file, "utf8").replace('"alpha"', '"alphb"'),
    );
    expect(await manifestProblems(root, {})).toEqual([
      expect.stringContaining("stale or edited by hand"),
    ]);
  });
});
