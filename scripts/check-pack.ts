/**
 * Checks what each package would put into a published tarball, without building
 * one (`bun pm pack --dry-run`):
 *
 * - no dev content, test files or fixtures, build output or tooling configs;
 * - every file named by the package's `exports`, `bin` and
 *   `chromatis.manifest`, and every route and root file that manifest declares, is included, so the `files` whitelist is not too tight
 *   for the consumers (the generated manifest must exist when this runs).
 *
 * Run from anywhere: bun scripts/check-pack.ts
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, posix, resolve } from "node:path";

const FORBIDDEN: [RegExp, string][] = [
  [
    /(^|\/)(dev|test|tests|__tests__|fixtures?|content)\//,
    "dev content or test fixtures",
  ],
  [/\.(test|spec)\.[cm]?[jt]sx?$/, "a test file"],
  [/\.workerd\.entry\.ts$/, "test support"],
  [
    /(^|\/)(\.catalog|\.chromatis|\.react-router|\.wrangler|build|node_modules)\//,
    "generated or installed files",
  ],
  [
    /(^|\/)(tsconfig[^/]*\.json|eslint\.config\.[^/]+|\.prettier[^/]*|bunfig\.toml|bun\.lock|chromatis\.toml)$/,
    "tooling config the consumer does not need",
  ],
];

/** The packed paths that must not ship, each with the reason. */
export function forbiddenPacked(files: string[]): string[] {
  return files.flatMap((file) => {
    const hit = FORBIDDEN.find(([pattern]) => pattern.test(file));
    return hit ? [`${file} (${hit[1]})`] : [];
  });
}

/** Targets of `exports`, `bin` and `chromatis.manifest` that the packed files do not contain. */
export function missingTargets(
  manifest: {
    exports?: unknown;
    bin?: unknown;
    chromatis?: { manifest?: unknown };
  },
  files: string[],
): string[] {
  const targets: string[] = [];
  const collect = (value: unknown) => {
    if (typeof value === "string") {
      targets.push(value);
    } else if (value && typeof value === "object") {
      Object.values(value).forEach(collect);
    }
  };
  collect(manifest.exports);
  collect(manifest.bin);
  collect(manifest.chromatis?.manifest);
  return targets
    .filter(
      (target) => target.startsWith("./") && !target.endsWith("package.json"),
    )
    .map((target) => target.slice(2))
    .filter((target) => {
      const pattern = new RegExp(
        `^${target.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, "[^/]+")}$`,
      );
      return !files.some((file) => pattern.test(file));
    });
}

type RouteEntry = { file: string; children?: RouteEntry[] };
type ChromatisManifestJson = {
  app?: { root?: string; routes?: RouteEntry[] };
  modules?: { entry: string; routes?: RouteEntry[] }[];
};

const routeFiles = (routes: RouteEntry[] = []): string[] =>
  routes.flatMap((route) => [route.file, ...routeFiles(route.children)]);

/**
 * Route and root files named by a Chromatis manifest that the packed files
 * leave out. `manifestPath` is the manifest's path in the package; './' and
 * '../' files resolve from the manifest (package level) or from the module's
 * directory; bare specifiers are package exports, checked by missingTargets.
 */
export function missingRouteFiles(
  manifest: ChromatisManifestJson,
  manifestPath: string,
  files: string[],
): string[] {
  const manifestDirectory = posix.dirname(manifestPath);
  const declared = (from: string, list: string[]) =>
    list
      .filter((file) => file.startsWith("."))
      .map((file) => posix.join(from, file));
  const wanted = [
    ...declared(manifestDirectory, [
      ...(manifest.app?.root ? [manifest.app.root] : []),
      ...routeFiles(manifest.app?.routes),
    ]),
    ...(manifest.modules ?? []).flatMap((module) =>
      declared(
        posix.dirname(posix.join(manifestDirectory, module.entry)),
        routeFiles(module.routes),
      ),
    ),
  ];
  return [...new Set(wanted)].filter((file) => !files.includes(file));
}

function packedFiles(dir: string): string[] {
  const packed = Bun.spawnSync(["bun", "pm", "pack", "--dry-run"], {
    cwd: dir,
    stdout: "pipe",
    stderr: "pipe",
  });
  if (packed.exitCode !== 0) {
    throw new Error(`bun pm pack failed in ${dir}:\n${packed.stderr}`);
  }
  return `${packed.stdout}\n${packed.stderr}`
    .split("\n")
    .flatMap((line) => /^packed \S+ (.+)$/.exec(line.trim())?.[1] ?? []);
}

/** All problems of the packages under `<root>/packages`; empty when clean. */
export function checkPack(root: string): string[] {
  const packages = join(root, "packages");
  return readdirSync(packages)
    .map((name) => join(packages, name))
    .filter((dir) => existsSync(join(dir, "package.json")))
    .flatMap((dir) => {
      const manifest = JSON.parse(
        readFileSync(join(dir, "package.json"), "utf8"),
      );
      const files = packedFiles(dir);
      const manifestPath: unknown = manifest.chromatis?.manifest;
      const chromatis: ChromatisManifestJson | undefined =
        typeof manifestPath === "string" && existsSync(join(dir, manifestPath))
          ? JSON.parse(readFileSync(join(dir, manifestPath), "utf8"))
          : undefined;
      return [
        ...(manifest.files
          ? []
          : [`${manifest.name}: package.json needs a "files" whitelist`]),
        ...forbiddenPacked(files).map(
          (f) => `${manifest.name} would ship ${f}`,
        ),
        ...missingTargets(manifest, files).map(
          (t) => `${manifest.name}: ${t} is exported but not packed`,
        ),
        ...(chromatis
          ? missingRouteFiles(
              chromatis,
              posix.normalize(String(manifest.chromatis.manifest)),
              files,
            ).map(
              (f) =>
                `${manifest.name}: ${f} is a declared route or root file but not packed`,
            )
          : []),
      ];
    });
}

if (import.meta.main) {
  const problems = checkPack(resolve(import.meta.dir, ".."));
  if (problems.length) {
    console.error(`Packed file lists are wrong:\n- ${problems.join("\n- ")}`);
    process.exit(1);
  }
  console.log("Packed file lists ok");
}
