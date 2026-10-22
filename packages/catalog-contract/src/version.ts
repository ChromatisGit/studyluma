/**
 * The version of the compiled catalog format. The compiler writes it into
 * `catalog.meta.json`, the app accepts exactly this version. Bump it whenever
 * the catalog types change in a way an older reader cannot handle.
 */
export const CATALOG_FORMAT_VERSION = 6 as const;
