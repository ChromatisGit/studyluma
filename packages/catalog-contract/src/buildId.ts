import { nodeBuiltins } from "./node";
import type { Catalog } from "./types";

/**
 * The content hash of a catalog: the SHA-256 digest of its JSON without the
 * `buildId` field. The compiler computes it, the validator recomputes it.
 */
export function computeCatalogBuildId(
  catalog: Omit<Catalog, "buildId">,
): string {
  return nodeBuiltins()
    .crypto.createHash("sha256")
    .update(JSON.stringify(catalog))
    .digest("hex");
}
