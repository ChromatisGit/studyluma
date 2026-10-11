# StudyLuma Compiler

`@studyluma/compiler` is the only supported content compiler. It is build-time only and depends on `@studyluma/catalog-contract` alone. Authors write the syntax described in [`StudyLuma_Autorenhandbuch.md`](../../../StudyLuma_Autorenhandbuch.md) under a root shaped as `<subject>/<topic>/<chapter>`. Topic folders (`<anything>/<topic>/`) hold a `thema.toml` (`titel`, optional `icon` or an `icon.svg`), and `kurse/<course>.toml` lists the topics and chapters of a course in order (`titel`, and a `[themen]` table of topic folder = chapter list). `definitions.toml` holds the lesson times (`stundenplan`). All configuration is TOML, validated by zod schemas that define the fields, their defaults and which keys exist (`src/config.ts`, `src/graphic.ts`, parsing in `src/toml.ts`); Markdown front matter sits between `+++` lines. Each chapter can contain `inhalt.md`, `challenges.md`, `aufgaben/*.md`, `quiz/*.md`, and `folien/*.md`. Obsolete syntax (old paths, unquoted titles, `Lückentext`/`Ergebnis`, `::struktur`, `# Folie`, `::bis{}` …) is rejected with an `OBSOLETE_SYNTAX` or related diagnostic. The document itself defines front matter, headings, markers, references, math, and image syntax.

## Build

As a build contribution (the normal path): the app's `catalog` module declares `@studyluma/compiler/contribution`. During `chromatis build` and `chromatis check` it reads the instance's `config/catalog.toml` (`content`, default `content`; `courses`, the published course ids) and writes the catalog artifact to `.chromatis/artifacts/catalog/` (`catalog.json`, `catalog.meta.json`, `asset-manifest.json`, content-hashed files in `assets/`). Only the listed `kurse/<id>.toml` are compiled into the catalog; other course files are not read, and a listed course without a file is an error (`COURSE_UNKNOWN`). All authored chapters, topics and assets are still compiled. The contribution's types are structural, so the package imports nothing from Chromatis, and it never enters the app's runtime graph.

As a command, for inspecting content outside an instance:

```sh
bun run compile <content-root> <output-root>   # in packages/compiler
```

It writes `v1/<buildId>/` with the same files into a temporary directory and publishes it only when validation succeeds; an existing build directory is left untouched. Either way all documents and their reference graph are validated. `catalog.meta.json` (`formatVersion`, `buildId`, `compiler.name`/`compiler.version`) has no timestamp: the same content always yields the same files. Error diagnostics include file and line; warnings are printed and do not fail the build.

`buildId` is the SHA-256 digest of the normalized catalog before its `buildId` field is added (`computeCatalogBuildId` in the contract). Technical entity IDs derive from source positions and only promise uniqueness within that build. Runtime identity is `(buildId, compiledEntityId)`. Repeated Foliensatz entries additionally use placement IDs derived from the root presentation and inclusion path. There is no persistent ID registry.

The compiled catalog has `schemaVersion: 1` and top-level `timetable`, `topics`, `courses`, `chapters`, `summaries`, `worksheets`, `challengePools`, `quizzes`, `foliensaetze`, `presentations`, and `assets`. Source entities occur once. Each directly startable Foliensatz has an expanded presentation whose placements point to source entry IDs; slide content is not copied into every placement. Worksheet, Quiz, and local Foliensatz names resolve in the source file's chapter. Local `# Merkkarte: "Name"` and `# Inhalt` entries resolve in the root presentation's chapter. Cross-chapter Merkkarten and Foliensätze are Markdown links (`../kapitel/inhalt.md#anker`, `../kapitel/folien/datei.md`) resolved relative to the referencing file.

The tests build their representative content in a temporary directory (`test/compile.test.ts`, `test/contribution.test.ts`). `bun run check` runs typecheck, format and tests. Math is validated with kern-typ during compilation and stored as MathML. Expected answers also carry a prepared math row for checking; the Website never needs to parse authored Typst.

## Grafiken

`::grafik [Beschreibung](pfad.toml)` embeds a Grafik file (TOML: `[achsen]`, `[[graph]]`, `[[punkt]]`, `[[parameter]]`, `[eingabe]`; see the Autorenhandbuch, 2.8) as a `graphic` rich node. `src/graphic.ts` validates it; graph terms are compiled to math rows like expected answers, and the Website evaluates them in the browser. A `## Graph` task has one `::grafik` with `eingabe` and one `::antwort` line per expected function (`eingabe.anzahl`), stored as `answers` on the task part.

A `---` block terminator is interpreted according to its containing document; a new part after a terminator stays in the same multipart task.
