import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  checkPack,
  forbiddenPacked,
  missingRouteFiles,
  missingTargets,
} from "./check-pack";

describe("forbiddenPacked", () => {
  test("flags dev content, tests, fixtures and tooling configs", () => {
    expect(
      forbiddenPacked([
        "src/index.ts",
        "dev/content/a.md",
        "src/a.test.ts",
        "src/test/site.ts",
        "test/fixture.ts",
        "src/modules/x/fixtures/a.json",
        "src/modules/content-renderer/index.ts",
        "tsconfig.json",
        ".catalog/catalog.json",
        "src/classroom.workerd.entry.ts",
      ]),
    ).toEqual([
      "dev/content/a.md (dev content or test fixtures)",
      "src/a.test.ts (a test file)",
      "src/test/site.ts (dev content or test fixtures)",
      "test/fixture.ts (dev content or test fixtures)",
      "src/modules/x/fixtures/a.json (dev content or test fixtures)",
      "tsconfig.json (tooling config the consumer does not need)",
      ".catalog/catalog.json (generated or installed files)",
      "src/classroom.workerd.entry.ts (test support)",
    ]);
  });
});

describe("missingTargets", () => {
  const manifest = {
    exports: { ".": "./src/index.ts", "./routes/*": "./app/routes/*.tsx" },
    bin: { tool: "./cli.ts" },
  };

  test("accepts packages that contain every exported file, globs included", () => {
    expect(
      missingTargets(manifest, ["src/index.ts", "app/routes/a.tsx", "cli.ts"]),
    ).toEqual([]);
  });

  test("reports an exported file the whitelist leaves out", () => {
    expect(
      missingTargets(manifest, ["src/index.ts", "app/routes/a.tsx"]),
    ).toEqual(["cli.ts"]);
  });

  test("reports a Chromatis manifest the whitelist leaves out", () => {
    const withManifest = {
      ...manifest,
      chromatis: { manifest: "./dist/chromatis.manifest.json" },
    };
    const files = ["src/index.ts", "app/routes/a.tsx", "cli.ts"];
    expect(missingTargets(withManifest, files)).toEqual([
      "dist/chromatis.manifest.json",
    ]);
    expect(
      missingTargets(withManifest, [...files, "dist/chromatis.manifest.json"]),
    ).toEqual([]);
  });
});

describe("missingRouteFiles", () => {
  const manifest = {
    app: {
      root: "../app/root.tsx",
      routes: [
        {
          file: "../app/routes/shell.tsx",
          children: [{ file: "../app/routes/home.tsx" }],
        },
        { file: "@product/app/routes/exported" },
      ],
    },
    modules: [
      {
        entry: "../src/modules/join/module.ts",
        routes: [{ file: "./routes/join.tsx" }, { file: "../../../app/x.ts" }],
      },
    ],
  };
  const all = [
    "app/root.tsx",
    "app/routes/shell.tsx",
    "app/routes/home.tsx",
    "src/modules/join/routes/join.tsx",
    "app/x.ts",
  ];

  test("accepts a package that packs every declared file", () => {
    expect(
      missingRouteFiles(manifest, "dist/chromatis.manifest.json", all),
    ).toEqual([]);
  });

  test("reports the root, nested and module route files that are left out", () => {
    expect(
      missingRouteFiles(
        manifest,
        "dist/chromatis.manifest.json",
        all.filter((f) => !/root|home|join\.tsx/.test(f)),
      ),
    ).toEqual([
      "app/root.tsx",
      "app/routes/home.tsx",
      "src/modules/join/routes/join.tsx",
    ]);
  });
});

test("the real packages ship no dev content and everything they export", () => {
  expect(checkPack(resolve(import.meta.dir, ".."))).toEqual([]);
});
