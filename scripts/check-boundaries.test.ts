import { afterAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import {
  checkBoundaries,
  componentProblems,
  importsOf,
} from "./check-boundaries";

const roots: string[] = [];
afterAll(() => roots.forEach((root) => rmSync(root, { recursive: true })));

/** A monorepo in a temp directory: package manifests plus source files per package. */
function repo(
  packages: Record<string, { dependencies?: Record<string, string> }>,
  files: Record<string, string> = {},
) {
  const root = mkdtempSync(join(tmpdir(), "boundaries-"));
  roots.push(root);
  const write = (path: string, text: string) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  };
  for (const [name, manifest] of Object.entries(packages)) {
    const folder = name.replace("@studyluma/", "");
    write(
      `packages/${folder}/package.json`,
      JSON.stringify({ name, ...manifest }),
    );
  }
  for (const [path, text] of Object.entries(files)) {
    write(path, text);
  }
  return root;
}

const clean = {
  "@studyluma/catalog-contract": {},
  "@studyluma/compiler": {
    dependencies: {
      "@studyluma/catalog-contract": "workspace:*",
      "smol-toml": "1",
    },
  },
  "@studyluma/app": {
    dependencies: {
      "@studyluma/catalog-contract": "workspace:*",
      "@chromatis/base": "1",
    },
  },
};

describe("importsOf", () => {
  test("sees plain, type-only, re-exported and dynamic imports", () => {
    const code = `
      import a from "a";
      import type { B } from "b";
      export { c } from "c";
      export type * from "d";
      const e = await import("e");
    `;
    expect(importsOf(code)).toEqual(["a", "b", "c", "d", "e"]);
  });
});

describe("checkBoundaries", () => {
  test("the real repository is clean", () => {
    expect(checkBoundaries(resolve(import.meta.dir, ".."))).toEqual([]);
  });

  test("allowed imports pass", () => {
    const root = repo(clean, {
      "packages/catalog-contract/src/a.ts": `import { b } from "./b"; import { x } from "node:fs";`,
      "packages/compiler/src/a.ts": `import { parse } from "smol-toml"; import type { Catalog } from "@studyluma/catalog-contract"; import "bun:test";`,
      "packages/app/src/a.ts": `import "@chromatis/base/ui"; import type { Catalog } from "@studyluma/catalog-contract";`,
    });
    expect(checkBoundaries(root)).toEqual([]);
  });

  test("the contract imports nothing outside itself", () => {
    const root = repo(clean, {
      "packages/catalog-contract/src/a.ts": `import { z } from "zod";`,
      "packages/catalog-contract/src/b.ts": `import type { Chromatis } from "@chromatis/base";`,
      "packages/catalog-contract/src/c.ts": `export * from "@studyluma/compiler";`,
      "packages/catalog-contract/src/d.ts": `import "../../compiler/src/a";`,
    });
    const problems = checkBoundaries(root);
    expect(problems).toHaveLength(4);
    expect(problems.join("\n")).toContain("a.ts imports zod");
    expect(problems.join("\n")).toContain(
      "d.ts imports ../../compiler/src/a (reaches outside the package)",
    );
  });

  test("the contract declares no dependencies", () => {
    const root = repo({
      ...clean,
      "@studyluma/catalog-contract": { dependencies: { zod: "3" } },
    });
    expect(checkBoundaries(root)[0]).toContain("no runtime dependencies");
  });

  test("the compiler may not know Chromatis or the app", () => {
    const root = repo(clean, {
      "packages/compiler/src/a.ts": `import "@chromatis/base";`,
      "packages/compiler/src/b.ts": `import "@studyluma/app/app/root";`,
      "packages/compiler/src/c.ts": `import "undeclared";`,
    });
    const text = checkBoundaries(root).join("\n");
    expect(text).toContain("a.ts imports @chromatis/base");
    expect(text).toContain("b.ts imports @studyluma/app/app/root");
    expect(text).toContain(
      "c.ts imports undeclared (not a declared dependency",
    );
  });

  test("the app never imports the compiler, not even its types or lazily", () => {
    const root = repo(clean, {
      "packages/app/src/a.ts": `import { writeBuild } from "@studyluma/compiler/src/compile";`,
      "packages/app/src/b.ts": `import type { Bundle } from "@studyluma/compiler";`,
      "packages/app/src/c.ts": `export const load = () => import("@studyluma/compiler");`,
      "packages/app/src/d.test.ts": `import "@studyluma/compiler";`,
    });
    expect(checkBoundaries(root)).toHaveLength(4);
  });

  test("the compiler may not appear in the app's dependency graph", () => {
    const direct = repo({
      ...clean,
      "@studyluma/app": {
        dependencies: { "@studyluma/compiler": "workspace:*" },
      },
    });
    expect(checkBoundaries(direct).join("\n")).toContain(
      "compiler is build-time only",
    );

    const indirect = repo({
      ...clean,
      "@studyluma/app": { dependencies: { "@studyluma/tools": "workspace:*" } },
      "@studyluma/tools": {
        dependencies: { "@studyluma/compiler": "workspace:*" },
      },
    });
    expect(checkBoundaries(indirect).join("\n")).toContain(
      "@studyluma/compiler is in the app's dependency graph",
    );
  });

  test("no package depends on the app", () => {
    const root = repo({
      ...clean,
      "@studyluma/compiler": {
        dependencies: { "@studyluma/app": "workspace:*" },
      },
    });
    expect(checkBoundaries(root).join("\n")).toContain(
      "depends on @studyluma/app",
    );
  });
  describe("the Development instance", () => {
    const dev = JSON.stringify({ name: "studyluma-dev", private: true });

    test("must be private", () => {
      const root = repo(clean, {
        "dev/package.json": JSON.stringify({ name: "studyluma-dev" }),
      });
      expect(checkBoundaries(root).join("\n")).toContain('must be "private"');
    });

    test("no package imports from it, by path or by name", () => {
      const root = repo(clean, {
        "dev/package.json": dev,
        "dev/content/x.ts": "export const x = 1;",
        "packages/app/src/a.ts": 'import { x } from "../../../dev/content/x";',
        "packages/compiler/src/b.ts": 'import "studyluma-dev";',
      });
      const problems = checkBoundaries(root).join("\n");
      expect(problems).toContain("a.ts imports ../../../dev/content/x");
      expect(problems).toContain("packages never import from dev/");
      expect(problems).toContain("b.ts imports studyluma-dev");
    });

    test("no package depends on it", () => {
      const root = repo(
        {
          ...clean,
          "@studyluma/app": {
            dependencies: { "studyluma-dev": "workspace:*" },
          },
        },
        { "dev/package.json": dev },
      );
      expect(checkBoundaries(root).join("\n")).toContain(
        "must not depend on studyluma-dev",
      );
    });

    test("may consume the packages", () => {
      const root = repo(clean, {
        "dev/package.json": JSON.stringify({
          name: "studyluma-dev",
          private: true,
          dependencies: { "@studyluma/app": "workspace:*" },
        }),
        "dev/src/a.ts": 'import "@studyluma/app/app/root";',
      });
      expect(checkBoundaries(root)).toEqual([]);
    });
  });
});

describe("component folders", () => {
  const folder = (files: Record<string, string>) =>
    join(repo({}, files), "components");

  test("index.ts with the API and view.tsx with React are fine", () => {
    const dir = folder({
      "components/probe/index.ts": `import { defineComponent } from "@studyluma/component-api";\nimport { helper } from "./helper";`,
      "components/probe/helper.ts": "export const helper = 1;",
      "components/probe/view.tsx": `import { useEffect } from "react";\nimport type { ViewProps } from "@studyluma/component-api/view";\nimport { helper } from "./helper";`,
    });
    expect(componentProblems(dir)).toEqual([]);
  });

  test("the build side imports no React and not the view", () => {
    const dir = folder({
      "components/probe/index.ts": `import "react";\nimport "mafs";\nimport "./view";\nimport "@studyluma/component-api/view";`,
      "components/probe/view.tsx": "",
    });
    const problems = componentProblems(dir).join("\n");
    expect(problems).toContain("probe/index.ts imports react");
    expect(problems).toContain("probe/index.ts imports mafs");
    expect(problems).toContain("probe/index.ts imports ./view");
    expect(problems).toContain("imports @studyluma/component-api/view");
  });

  test("the view imports no compile code and not the build side", () => {
    const dir = folder({
      "components/probe/index.ts": "",
      "components/probe/view.tsx": `import "node:fs";\nimport "./index";\nimport { defineComponent } from "@studyluma/component-api";\nimport "@studyluma/compiler";\nimport "@chromatis/base/ui";\nimport "../other/view";`,
    });
    const problems = componentProblems(dir).join("\n");
    expect(problems).toContain("view.tsx imports node:fs");
    expect(problems).toContain("view.tsx imports ./index");
    expect(problems).toContain("view.tsx imports @studyluma/component-api (");
    expect(problems).toContain("view.tsx imports @studyluma/compiler");
    expect(problems).toContain("view.tsx imports @chromatis/base/ui");
    expect(problems).toContain("reaches outside the component folder");
  });
});

describe("component-api", () => {
  test("knows only the contract and React types", () => {
    const root = repo(
      {
        ...clean,
        "@studyluma/component-api": {
          dependencies: { "@studyluma/catalog-contract": "workspace:*" },
        },
      },
      {
        "packages/component-api/src/index.ts": `import type { Graphic } from "@studyluma/catalog-contract";\nimport type { ReactNode } from "react";\nimport { z } from "zod";`,
      },
    );
    const problems = checkBoundaries(root);
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain("imports zod");
  });
});
