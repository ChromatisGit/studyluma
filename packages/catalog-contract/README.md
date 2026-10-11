# Catalog contract

`@studyluma/catalog-contract` defines the compiled StudyLuma catalog that the compiler writes and the app reads. It depends on nothing: no Chromatis, no other StudyLuma package, no runtime dependencies. Results are plain objects.

- **Types and shape** — the catalog types, `catalogShapeErrors` (structure of `catalog.json`).
- **Format** — `CATALOG_FORMAT_VERSION` and `CatalogArtifactMeta` (`formatVersion`, `buildId`, `compiler.{name,version}`); `checkCatalogCompatibility(meta)` accepts exactly one format version. `computeCatalogBuildId` is the content hash used as `buildId`.
- **Artifact** — a directory with `catalog.json`, `catalog.meta.json`, `asset-manifest.json` and content-hashed `assets/`. `validateCatalogArtifact(dir)` (also the subpath `@studyluma/catalog-contract/validate`, the artifact validator Chromatis calls) returns `{ ok: true }` or `{ ok: false, errors }` and never throws. It checks the meta and its compatibility, the structure, that meta and catalog name the same build, that the build id is the content hash, and every asset's size and digest.
- **Math** — the math-row types and `typstToRow` / `prepareTypstMath`, shared by compiler and app.

`bun run check` runs typecheck, format and tests.
