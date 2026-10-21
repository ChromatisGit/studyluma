/**
 * Generates `dist/chromatis.manifest.json`, the list of this package's Chromatis
 * modules that instances discover through `"chromatis": { "manifest": ... }` in
 * package.json.
 *
 * The app's own root and routes come from `routes.ts` (package-level); each
 * module declares its routes in its `module.ts`. Every declared file must exist.
 *
 * Discovery is the sorted directories of `src/modules/` that contain a
 * `module.ts`; nothing else lists modules. Each `module.ts` is imported and
 * validated, then written with Chromatis' own `createManifest` /
 * `serializeManifest`, so the output is deterministic.
 *
 *   bun scripts/generate-manifest.ts           write the manifest
 *   bun scripts/generate-manifest.ts --check   fail if the file on disk is
 *                                              missing, stale or hand-edited
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  createManifest,
  parseModuleDeclaration,
  serializeManifest,
  type ModuleDeclaration,
  type RouteDeclaration,
} from "@chromatis/base/module";
import { exportedFile } from "./exports";
import {
  document as productDocument,
  publicDirectory as productPublic,
  root as productRoot,
  routes as productRoutes,
  server as productServer,
} from "./routes";

export const MODULES_DIRECTORY = "src/modules";
export const MODULE_FILE = "module.ts";
export const MANIFEST_FILE = "dist/chromatis.manifest.json";

/** The module directories, sorted: those of `src/modules/` that hold a `module.ts`. */
export function discoverModules(packageRoot: string): string[] {
  return readdirSync(join(packageRoot, MODULES_DIRECTORY), {
    withFileTypes: true,
  })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        existsSync(
          join(packageRoot, MODULES_DIRECTORY, entry.name, MODULE_FILE),
        ),
    )
    .map((entry) => entry.name)
    .sort();
}

async function loadModule(
  packageRoot: string,
  name: string,
): Promise<{ declaration?: ModuleDeclaration; problems: string[] }> {
  const file = join(packageRoot, MODULES_DIRECTORY, name, MODULE_FILE);
  const where = `${MODULES_DIRECTORY}/${name}/${MODULE_FILE}`;
  let exported: unknown;
  try {
    exported = (
      (await import(pathToFileURL(file).href)) as { default?: unknown }
    ).default;
  } catch (error) {
    return {
      problems: [
        `${where}: cannot load: ${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  }
  const parsed = parseModuleDeclaration(exported);
  if (!parsed.ok) {
    return {
      problems: parsed.issues.map(
        (issue) =>
          `${where}: must default export defineModule({...}): ${issue.path ? `${issue.path}: ` : ""}${issue.message}`,
      ),
    };
  }
  const { declaration } = parsed;
  const problems: string[] = [];
  if (declaration.name !== name) {
    problems.push(
      `${where}: declares name "${declaration.name}" but the directory is "${name}"`,
    );
  }
  if (
    declaration.serverHook &&
    !existsSync(resolve(dirname(file), declaration.serverHook))
  ) {
    problems.push(
      `${where}: serverHook ${declaration.serverHook} does not exist next to ${MODULE_FILE}`,
    );
  }
  return { declaration, problems };
}

export type AppDeclaration = Parameters<typeof createManifest>[1] & {};

const PRODUCT: AppDeclaration = {
  root: productRoot,
  server: productServer,
  document: productDocument,
  public: productPublic,
  routes: productRoutes,
};

/**
 * Declared files that do not exist: './' paths next to `base`, and
 * specifiers of this package's own exports.
 */
function missingFiles(
  files: readonly string[],
  base: string,
  packageRoot: string,
  where: string,
): string[] {
  return files
    .filter((file) =>
      file.startsWith(".")
        ? !existsSync(resolve(base, file))
        : exportedFile(packageRoot, file) === undefined,
    )
    .map((file) => `${where}: ${file} does not exist`);
}

function routeFiles(routes: readonly RouteDeclaration[]): string[] {
  return routes.flatMap((route) => [
    route.file,
    ...(route.server ? [route.server] : []),
    ...routeFiles(route.children ?? []),
  ]);
}

/**
 * The manifest text for the modules found in `packageRoot` and the app's root
 * and routes; throws listing every problem.
 */
export async function buildManifest(
  packageRoot: string,
  app: AppDeclaration = PRODUCT,
): Promise<string> {
  const manifestDirectory = dirname(join(packageRoot, MANIFEST_FILE));
  const problems: string[] = [];
  const modules: { entry: string; declaration: ModuleDeclaration }[] = [];
  for (const name of discoverModules(packageRoot)) {
    const loaded = await loadModule(packageRoot, name);
    problems.push(...loaded.problems);
    if (loaded.declaration) {
      problems.push(
        ...missingFiles(
          routeFiles(loaded.declaration.routes),
          join(packageRoot, MODULES_DIRECTORY, name),
          packageRoot,
          `${MODULES_DIRECTORY}/${name}/${MODULE_FILE} routes`,
        ),
      );
    }
    if (loaded.declaration && loaded.problems.length === 0) {
      modules.push({
        // Relative to the manifest file, as Chromatis resolves './' and '../' specifiers.
        entry: relative(
          manifestDirectory,
          join(packageRoot, MODULES_DIRECTORY, name, MODULE_FILE),
        )
          .split("\\")
          .join("/"),
        declaration: loaded.declaration,
      });
    }
  }
  problems.push(
    ...missingFiles(
      [
        ...(app.root ? [app.root] : []),
        ...(app.server ? [app.server] : []),
        ...routeFiles(app.routes ?? []),
      ],
      manifestDirectory,
      packageRoot,
      "scripts/routes.ts",
    ),
  );
  if (problems.length > 0) {
    throw new Error(
      `Chromatis manifest cannot be generated:\n- ${problems.join("\n- ")}`,
    );
  }
  return serializeManifest(createManifest(modules, app));
}

export async function writeManifest(
  packageRoot: string,
  app: AppDeclaration = PRODUCT,
): Promise<string> {
  const text = await buildManifest(packageRoot, app);
  const file = join(packageRoot, MANIFEST_FILE);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
  return file;
}

/** Problems of the manifest on disk against what discovery produces now; empty when current. */
export async function manifestProblems(
  packageRoot: string,
  app: AppDeclaration = PRODUCT,
): Promise<string[]> {
  const expected = await buildManifest(packageRoot, app);
  const file = join(packageRoot, MANIFEST_FILE);
  if (!existsSync(file)) {
    return [`${MANIFEST_FILE} is missing; run: bun run manifest`];
  }
  return readFileSync(file, "utf8") === expected
    ? []
    : [
        `${MANIFEST_FILE} does not match the modules in ${MODULES_DIRECTORY}/ and scripts/routes.ts (stale or edited by hand); run: bun run manifest`,
      ];
}

if (import.meta.main) {
  const packageRoot = resolve(import.meta.dir, "..");
  try {
    if (process.argv.includes("--check")) {
      const problems = await manifestProblems(packageRoot);
      if (problems.length > 0) {
        throw new Error(problems.join("\n"));
      }
      console.log("Chromatis manifest is current");
    } else {
      console.log(
        `Wrote ${relative(process.cwd(), await writeManifest(packageRoot)) || MANIFEST_FILE}`,
      );
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
