# Catalog contract

`@studyluma/catalog-contract` defines the compiled StudyLuma catalog that the compiler writes and the app reads. It depends on nothing: no Chromatis, no other StudyLuma package, no runtime dependencies. Results are plain objects.

- **Types and shape** — the catalog types, `catalogShapeErrors` (structure of `catalog.json`).
- **Format** — `CATALOG_FORMAT_VERSION` and `CatalogArtifactMeta` (`formatVersion`, `buildId`, `compiler.{name,version}`, `components` with `name` and `version`); `checkCatalogCompatibility(meta)` accepts exactly one format version, `checkCatalogComponents(meta, known)` says which used components an app build does not activate. `computeCatalogBuildId` is the content hash used as `buildId`.
- **Artifact** — a directory with `catalog.json`, `catalog.meta.json`, `asset-manifest.json` and content-hashed `assets/`. `validateCatalogArtifact(dir)` (also the subpath `@studyluma/catalog-contract/validate`, the artifact validator Chromatis calls) returns `{ ok: true }` or `{ ok: false, errors }` and never throws. It checks the meta and its compatibility, the structure, that meta and catalog name the same build, that the build id is the content hash, that the meta lists exactly the components the catalog uses (`componentsIn`), and every asset's size and digest.
- **Components** — a `component` rich node and a slide's `componentSlide` (`ComponentUse`: `name`, `title` for screen readers, `props` as plain JSON from the component's compile step).
- **Math** — the math-row types and `typstToRow` / `prepareTypstMath`, shared by compiler and app.

`bun run check` runs typecheck, format and tests.
