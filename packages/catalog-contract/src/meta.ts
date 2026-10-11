import { CATALOG_FORMAT_VERSION } from "./version";

/** Names of the files that make up a catalog artifact (directory). */
export const CATALOG_FILE = "catalog.json";
export const CATALOG_META_FILE = "catalog.meta.json";

/**
 * `catalog.meta.json`: who built the artifact and for which format. It holds
 * no timestamps, so the same content always produces the same file.
 */
export type CatalogArtifactMeta = {
  formatVersion: number;
  /** The content hash of the catalog (`Catalog.buildId`). */
  buildId: string;
  compiler: { name: string; version: string };
};

/** Plain result of every check: no thrown errors, no framework types. */
export type CheckResult = { ok: true } | { ok: false; errors: string[] };

export const isBuildId = (value: unknown): value is string =>
  typeof value === "string" && /^[a-f0-9]{64}$/.test(value);

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Structural problems of a parsed `catalog.meta.json`; empty when it is well formed. */
export function catalogMetaErrors(meta: unknown): string[] {
  if (!isObject(meta)) {
    return [`${CATALOG_META_FILE} must be a JSON object`];
  }
  const errors: string[] = [];
  if (!Number.isInteger(meta.formatVersion)) {
    errors.push(`${CATALOG_META_FILE}: formatVersion must be an integer`);
  }
  if (!isBuildId(meta.buildId)) {
    errors.push(`${CATALOG_META_FILE}: buildId must be a SHA-256 hex digest`);
  }
  const compiler = meta.compiler;
  if (
    !isObject(compiler) ||
    typeof compiler.name !== "string" ||
    !compiler.name ||
    typeof compiler.version !== "string" ||
    !compiler.version
  ) {
    errors.push(`${CATALOG_META_FILE}: compiler needs a name and a version`);
  }
  return errors;
}

/**
 * Whether this build of the app can read an artifact with this meta. Exactly
 * one format version is supported at a time.
 */
export function checkCatalogCompatibility(meta: unknown): CheckResult {
  const errors = catalogMetaErrors(meta);
  if (errors.length) {
    return { ok: false, errors };
  }
  const { formatVersion, compiler } = meta as CatalogArtifactMeta;
  if (formatVersion !== CATALOG_FORMAT_VERSION) {
    return {
      ok: false,
      errors: [
        `The catalog has format version ${formatVersion} (built by ${compiler.name} ${compiler.version}), but this StudyLuma build reads format version ${CATALOG_FORMAT_VERSION}. Rebuild the catalog with a matching compiler.`,
      ],
    };
  }
  return { ok: true };
}

/** `catalog.meta.json` exactly as it is written to disk. */
export function serializeCatalogMeta(meta: CatalogArtifactMeta): string {
  return JSON.stringify(meta, null, 2) + "\n";
}
