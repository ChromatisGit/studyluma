/**
 * The catalog build contribution: Chromatis runs it during the instance
 * build (declared by the app's `catalog` module) and embeds the artifact it
 * writes. The types are structural so this package imports nothing from
 * Chromatis.
 */
import { rmSync } from "node:fs";
import { join, resolve } from "node:path";
import { catalogConfig, type ConfigByModule } from "./catalog-config";
import { CompileFailure, compileContent, writeCatalogFiles } from "./compile";

/** The argument Chromatis passes to every contribution. */
export type ContributionContext = Readonly<{
  instanceRoot: string;
  /** `.chromatis/artifacts`; the contribution writes into `<outDir>/catalog/`. */
  outDir: string;
  environment: string;
  /** Validated module configuration keyed by module name. */
  config: ConfigByModule;
}>;

/**
 * Compiles the instance's content root, publishing the configured courses,
 * into `<outDir>/catalog/` (`catalog.json`, `catalog.meta.json`, `assets/`).
 */
export default async function catalogContribution(
  context: ContributionContext,
): Promise<void> {
  const { content, courses } = catalogConfig(context.config);
  const root = resolve(context.instanceRoot, content);
  const target = join(context.outDir, "catalog");
  let compiled: ReturnType<typeof compileContent>;
  try {
    compiled = compileContent(root, { courses });
  } catch (error) {
    if (error instanceof CompileFailure) {
      throw new Error(`${content} does not compile:\n${error.message}`);
    }
    throw error;
  }
  for (const d of compiled.diagnostics) {
    console.warn(
      `${d.severity} ${d.file}:${d.line}:${d.column} ${d.code}: ${d.message}`,
    );
  }
  rmSync(target, { recursive: true, force: true });
  writeCatalogFiles(target, compiled);
}
