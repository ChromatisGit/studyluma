/**
 * Enforces the package boundaries of the monorepo mechanically:
 *
 * - catalog-contract imports nothing but its own files and Node built-ins and
 *   declares no dependencies (no Chromatis, no sibling package).
 * - compiler imports the contract, Node/Bun built-ins and its declared
 *   third-party dependencies only (no Chromatis, never the app).
 * - app never imports the compiler, and the compiler is not in the app's
 *   dependency graph (checked on package.json, workspace links included).
 * - No package reaches into another package's files by relative path.
 * - Nothing under packages/ imports from dev/ (the Development instance with
 *   its test content, never distributed) or depends on its package; dev/ is private.
 *
 * Run from anywhere: bun scripts/check-boundaries.ts
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import ts from "typescript";

const SCOPE = "@studyluma/";
const CONTRACT = `${SCOPE}catalog-contract`;
const COMPILER = `${SCOPE}compiler`;
const APP = `${SCOPE}app`;
const SKIPPED = new Set([
  "node_modules",
  ".catalog",
  ".chromatis",
  ".react-router",
  ".wrangler",
  "build",
  "dist",
  ".git",
]);
const SOURCE = /\.(?:[cm]?[jt]sx?)$/;
const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;
/** Fields that make up what a package needs to run. */
const RUNTIME_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;

type Manifest = Partial<
  Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>
> & { name?: string; private?: boolean };
type Workspace = { dir: string; name: string; manifest: Manifest };

const isBuiltin = (specifier: string) =>
  specifier.startsWith("node:") || specifier.startsWith("bun:");
const isRelative = (specifier: string) => specifier.startsWith(".");

/** The package name behind a bare specifier (`@a/b/c` -> `@a/b`, `a/b` -> `a`). */
function packageOf(specifier: string): string {
  const parts = specifier.split("/");
  return specifier.startsWith("@") ? parts.slice(0, 2).join("/") : parts[0]!;
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (SKIPPED.has(entry.name)) {
      return [];
    }
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      return sourceFiles(path);
    }
    return SOURCE.test(entry.name) ? [path] : [];
  });
}

/** Every module specifier of a file, type-only imports and `import()` included. */
export function importsOf(code: string): string[] {
  return ts
    .preProcessFile(code, true, true)
    .importedFiles.map((file) => file.fileName);
}

function readManifest(dir: string): Manifest {
  return JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
}

function workspaces(root: string): Workspace[] {
  const packages = join(root, "packages");
  if (!existsSync(packages)) {
    return [];
  }
  return readdirSync(packages)
    .map((name) => join(packages, name))
    .filter((dir) => existsSync(join(dir, "package.json")))
    .map((dir) => {
      const manifest = readManifest(dir);
      return { dir, name: manifest.name ?? dir, manifest };
    });
}

function declared(manifest: Manifest, fields: readonly string[]): string[] {
  return fields.flatMap((field) =>
    Object.keys(manifest[field as keyof Manifest] ?? {}),
  );
}

/** The workspace packages a package needs to run, directly or through others. */
function runtimeClosure(start: Workspace, all: Workspace[]): Set<string> {
  const byName = new Map(all.map((workspace) => [workspace.name, workspace]));
  const seen = new Set<string>();
  const queue = [start];
  while (queue.length) {
    const current = queue.pop()!;
    for (const name of declared(current.manifest, RUNTIME_FIELDS)) {
      const next = byName.get(name);
      if (next && !seen.has(name)) {
        seen.add(name);
        queue.push(next);
      }
    }
  }
  return seen;
}

/** The Development instance at `<root>/dev`, if the monorepo has one. */
function devInstance(root: string): Workspace | undefined {
  const dir = join(root, "dev");
  if (!existsSync(join(dir, "package.json"))) {
    return undefined;
  }
  const manifest = readManifest(dir);
  return { dir, name: manifest.name ?? dir, manifest };
}

function devProblems(dev: Workspace): string[] {
  return dev.manifest.private === true
    ? []
    : [
        `${dev.name}: dev/package.json must be "private": true (never distributed)`,
      ];
}

function manifestProblems(
  workspace: Workspace,
  all: Workspace[],
  dev?: Workspace,
): string[] {
  const { name, manifest } = workspace;
  const everything = declared(manifest, DEPENDENCY_FIELDS);
  const problems: string[] = [];
  if (dev && everything.includes(dev.name)) {
    problems.push(
      `${name}: package.json must not depend on ${dev.name} (dev/ is never distributed)`,
    );
  }
  const forbid = (dependency: string, why: string) =>
    problems.push(
      `${name}: package.json must not depend on ${dependency} (${why})`,
    );
  if (name === CONTRACT) {
    for (const dependency of everything.filter(
      (d) => d.startsWith("@chromatis/") || d.startsWith(SCOPE),
    )) {
      forbid(dependency, "the contract depends on nothing of ours");
    }
    for (const dependency of declared(manifest, RUNTIME_FIELDS)) {
      forbid(dependency, "the contract has no runtime dependencies");
    }
  }
  if (name === COMPILER) {
    for (const dependency of everything) {
      if (dependency.startsWith("@chromatis/") || dependency === APP) {
        forbid(dependency, "the compiler only knows the contract");
      }
    }
  }
  if (name === APP) {
    for (const dependency of everything.filter((d) => d === COMPILER)) {
      forbid(dependency, "the compiler is build-time only");
    }
    const closure = runtimeClosure(workspace, all);
    if (closure.has(COMPILER)) {
      problems.push(`${name}: ${COMPILER} is in the app's dependency graph`);
    }
  }
  for (const other of all) {
    if (other.name !== APP && runtimeClosure(other, all).has(APP)) {
      problems.push(`${other.name}: depends on ${APP}; only instances do`);
    }
  }
  return problems;
}

function importProblems(workspace: Workspace, dev?: Workspace): string[] {
  const { dir, name, manifest } = workspace;
  const own = new Set(declared(manifest, DEPENDENCY_FIELDS));
  const problems: string[] = [];
  for (const file of sourceFiles(dir)) {
    const shown = relative(dir, file).split(sep).join("/");
    const problem = (specifier: string, why: string) =>
      problems.push(`${name}: ${shown} imports ${specifier} (${why})`);
    for (const specifier of importsOf(readFileSync(file, "utf8"))) {
      if (isBuiltin(specifier)) {
        continue;
      }
      if (isRelative(specifier)) {
        const target = resolve(dirname(file), specifier);
        if (dev && !relative(dev.dir, target).startsWith("..")) {
          problem(specifier, "packages never import from dev/");
        } else if (relative(dir, target).startsWith("..")) {
          problem(specifier, "reaches outside the package");
        }
        continue;
      }
      const dependency = packageOf(specifier);
      if (dev && dependency === dev.name) {
        problem(specifier, "packages never import from dev/");
      } else if (name === CONTRACT) {
        problem(specifier, "the contract imports only its own files");
      } else if (name === COMPILER) {
        if (dependency.startsWith("@chromatis/") || dependency === APP) {
          problem(specifier, "the compiler only knows the contract");
        } else if (dependency !== CONTRACT && !own.has(dependency)) {
          problem(specifier, "not a declared dependency of the compiler");
        }
      } else if (name === APP && dependency === COMPILER) {
        problem(specifier, "the app never imports the compiler");
      }
    }
  }
  return problems;
}

/** All boundary violations of the monorepo at `root`; empty when it is clean. */
export function checkBoundaries(root: string): string[] {
  const all = workspaces(root);
  const dev = devInstance(root);
  return [
    ...(dev ? devProblems(dev) : []),
    ...all.flatMap((workspace) => [
      ...manifestProblems(workspace, all, dev),
      ...importProblems(workspace, dev),
    ]),
  ];
}

if (import.meta.main) {
  const root = resolve(import.meta.dir, "..");
  const problems = checkBoundaries(root);
  if (problems.length) {
    console.error(`Package boundaries violated:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Package boundaries ok");
}
