import { computeCatalogBuildId } from "./buildId";
import { componentsIn } from "./components";
import { nodeBuiltins } from "./node";
import {
  CATALOG_FILE,
  CATALOG_META_FILE,
  checkCatalogCompatibility,
  type CatalogArtifactMeta,
  type CheckResult,
} from "./meta";
import { catalogShapeErrors } from "./shape";
import type { Catalog } from "./types";

const ASSET_PATH = /^assets\/[a-f0-9]{64}\.(png|jpg|jpeg|webp|gif|svg)$/;

function readJson(
  dir: string,
  file: string,
): { value?: unknown; error?: string } {
  const { fs, path: nodePath } = nodeBuiltins();
  const { existsSync, readFileSync } = fs;
  const path = nodePath.join(dir, file);
  if (!existsSync(path)) {
    return { error: `${file} is missing in ${dir}` };
  }
  try {
    return { value: JSON.parse(readFileSync(path, "utf8")) };
  } catch (error) {
    return {
      error: `${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Checks a catalog artifact directory without changing it: `catalog.meta.json`
 * and its compatibility, the structure of `catalog.json`, that both agree on
 * the build id, that the build id is the content hash of the catalog, that
 * the meta lists exactly the components the catalog uses, and that
 * every asset exists with the recorded size and digest. Never throws; the
 * result is a plain object.
 */
export function validateCatalogArtifact(dir: string): CheckResult {
  const { crypto, fs, path: nodePath } = nodeBuiltins();
  const { existsSync, readFileSync, statSync } = fs;
  if (!existsSync(dir) || !statSync(dir).isDirectory()) {
    return { ok: false, errors: [`Catalog directory ${dir} does not exist`] };
  }
  const meta = readJson(dir, CATALOG_META_FILE);
  if (meta.error) {
    return { ok: false, errors: [meta.error] };
  }
  const compatibility = checkCatalogCompatibility(meta.value);
  if (!compatibility.ok) {
    return compatibility;
  }
  const catalogFile = readJson(dir, CATALOG_FILE);
  if (catalogFile.error) {
    return { ok: false, errors: [catalogFile.error] };
  }
  const errors = catalogShapeErrors(catalogFile.value);
  if (errors.length) {
    return { ok: false, errors };
  }
  const catalog = catalogFile.value as Catalog;
  const { buildId: declared } = meta.value as CatalogArtifactMeta;
  if (catalog.buildId !== declared) {
    errors.push(
      `${CATALOG_META_FILE} says build ${declared}, ${CATALOG_FILE} is build ${catalog.buildId}`,
    );
  }
  const { buildId, ...content } = catalog;
  if (computeCatalogBuildId(content) !== buildId) {
    errors.push(`${CATALOG_FILE} does not match its build id ${buildId}`);
  }
  const listed = (meta.value as CatalogArtifactMeta).components.map(
    (component) => component.name,
  );
  const used = componentsIn(content);
  for (const name of used.filter((name) => !listed.includes(name))) {
    errors.push(
      `${CATALOG_FILE} uses the component ${name}, which ${CATALOG_META_FILE} does not list`,
    );
  }
  for (const name of listed.filter((name) => !used.includes(name))) {
    errors.push(
      `${CATALOG_META_FILE} lists the component ${name}, which ${CATALOG_FILE} does not use`,
    );
  }
  for (const asset of catalog.assets) {
    if (!ASSET_PATH.test(asset.path)) {
      errors.push(`Asset ${asset.id} has an invalid path ${asset.path}`);
      continue;
    }
    const path = nodePath.join(dir, asset.path);
    if (!existsSync(path)) {
      errors.push(`Asset file ${asset.path} is missing`);
      continue;
    }
    const bytes = readFileSync(path);
    if (bytes.byteLength !== asset.byteLength) {
      errors.push(`Asset file ${asset.path} has the wrong size`);
    } else if (
      crypto.createHash("sha256").update(bytes).digest("hex") !== asset.sha256
    ) {
      errors.push(`Asset file ${asset.path} does not match its digest`);
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
