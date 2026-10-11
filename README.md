# StudyLuma

Teaching platform: course views, worksheets, lesson mode and temporary classroom sessions. This repository is a Bun workspace of three packages and the Development instance; the root only holds tooling (`scripts/`).

| Package                                                     | Role                                                                                                                                                                     |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `packages/catalog-contract` (`@studyluma/catalog-contract`) | The compiled catalog: types, `CATALOG_FORMAT_VERSION`, `CatalogArtifactMeta`, compatibility and artifact validation, shared math helpers. Depends on nothing.            |
| `packages/compiler` (`@studyluma/compiler`)                 | Author Markdown to catalog artifact; also the catalog build contribution. Build time only; depends on the contract.                                                      |
| `packages/app` (`@studyluma/app`)                           | The application, a Chromatis product package: modules, routes and the manifest instances discover. Depends on `@chromatis/base` and the contract; never on the compiler. |
| `dev/` (`studyluma-dev`)                                    | The Development instance: development config, test content, edge cases and UI fixtures. Private, never distributed.                                                      |

`scripts/check-boundaries.ts` enforces the boundaries mechanically (imports and package dependencies): the contract imports only itself, the compiler only the contract, the app never the compiler, and nothing under `packages/` touches `dev/`. `scripts/check-pack.ts` lists what each package would pack (`bun pm pack --dry-run`) and fails on dev content, tests, fixtures, tooling configs, an exported file or a declared route or manifest file the `files` whitelist leaves out.

## Workspace

StudyLuma lives in the outer Bun workspace `/home/ch/dev/studyluma-planning` together with `chromatis-base` and the other instances (Holst, Demo). Install once from there (`bun install`); every package and instance links to the others through `workspace:*`, so saved changes are visible everywhere at once. There is no registry, no Git pin, no tarball and no `bun link`; install inside the workspace, not standalone.

## From content to running app

An instance (Dev, Holst, Demo) depends on `@chromatis/base` and `@studyluma/app` (and `@studyluma/compiler` as a dev dependency) and holds only its decisions: `config/app.toml` (deployment target and domain, optionally `[modules] disabled`, `[routes] omit`), `config/catalog.toml` (content root and the published course ids), optionally `config/classroom.toml` and `config/shell.toml` (extra sidebar entries, account link), its `content/` and `package.json`. Chromatis discovers the app's manifest (`dist/chromatis.manifest.json`, generated from the modules and the route declaration) and runs the lifecycle:

1. Validate configuration against the module schemas.
2. Run the `catalog` contribution (`@studyluma/compiler/contribution`): compile the instance's content, only the published courses, into `.chromatis/artifacts/catalog/` (`catalog.json`, `catalog.meta.json`, `asset-manifest.json`, `assets/`).
3. Validate the artifact (`@studyluma/catalog-contract/validate`: format version, structure, build id, assets); a missing or incompatible catalog fails here.
4. Build the app with exactly that artifact embedded (`chromatis-artifacts`). The app never rebuilds content, reads no environment variable for it and checks the artifact again at startup.
5. Validate deployment prerequisites, then deploy.

The catalog is immutable and deterministic: `catalog.meta.json` holds `formatVersion`, `buildId` (content hash) and the compiler name and version, no timestamp. The app reads exactly one format version at a time.

## Commands

Run from an instance directory (`dev/`, or Holst or Demo):

```sh
bun run check      # chromatis check: config, artifacts, typecheck, lint, format, tests
bun run build      # chromatis build
bun run dev        # development server
bun run inspect    # modules, config, routes, contributions, artifacts, unmet requirements
```

`chromatis fix` creates missing config files from schema defaults and formats; `chromatis deploy` runs the preflight first. `bun run check` at this root runs the boundary and pack checks, every package's checks and the Development instance's.

See [packages/app](packages/app/README.md), [packages/compiler](packages/compiler/README.md), [packages/catalog-contract](packages/catalog-contract/README.md) and [dev](dev/README.md).
