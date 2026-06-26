# Code Review Notes (in progress)

Blunt code-quality review of `studyluma-website`. Working in bounded phases —
see plan below. This file is the handoff point for continuing the review in
a fresh session after context compression.

Review rules in effect: be aggressive but fair, no generic advice, no
rewrites of the whole project, no enterprise architecture unless clearly
justified, prefer boring/explicit/local code, challenge every abstraction
that doesn't pay for itself today, treat "maybe useful later" as suspicious.

For every issue: file/path, problem, why it matters, suggested fix, category
(YAGNI / anti-pattern / maintainability / correctness / typing / performance).

## Phase plan

| Phase | Focus | Status |
|---|---|---|
| 1 | Project structure & architecture boundaries | ✅ done |
| 2 | `server/services/*` — core domain/business logic | ✅ done |
| 3 | `core/` route handlers + `core/auth/` | ✅ done |
| 4 | `schema/` shared types (`courseTypes.ts`, `quizTypes.ts`, `slideTypes.ts`, `page.ts`, `checkpointTypes.ts`, `accentColors.ts`, `streamTypes.ts`, `courseContent.ts`) | ✅ done |
| 5 | `macros/` (23 folders — suspect for repetition/over-abstraction) | ⬜ |
| 6 | `features/quiz` + `features/slides` (largest, most stateful features) | ⬜ (skipped for now) |
| 7 | `ui/components` — shared component library | ✅ done |
| 8 | Remaining features (`admin`, `contentpage`, `demo`, `practice`, `access`) as needed | ✅ done (contentpage spot-checked, not exhaustive) |

Repo stats: React Router v7 SSR app, ~16.5k LOC / 246 TS/TSX files.
Layout: `src/{core,features,macros,schema,server,ui}` + `app/` (RR7 entry points).
`features/*` isolated from each other; `server/` never imported by `features`/`ui`;
boundaries enforced by ESLint (`eslint-plugin-boundaries`) + `@chromatis/base`'s
`checkArchitectureBoundaries.ts` (ships in `node_modules/@chromatis/base/infra/scripts/`,
not a local `scripts/` folder).

---

## Phase 1 — Project structure & architecture (done)

### Issues found

1. **`docs/ARCHITECTURE.md` describes a `src/platform/` layer that doesn't exist.**
   Docs (lines ~39, 55-62) describe `src/platform/` containing `db.server.ts`,
   `auth/`, `content.server.ts`, `index.server.ts`. On disk these files live
   directly under `src/core/`; `src/platform/` does not exist.
   **Fix:** update the doc to say `core/`, or finish the rename if that was
   the intent. Category: maintainability.

2. **`src/core/index.server.ts` barrel is inconsistently adopted.**
   ~22 files import via the barrel (`@core/index.server`), ~29 files bypass it
   and import `@core/db.server`, `@core/content.server`, `@core/auth/*`
   directly — including within the *same file*
   (`src/core/routes/home.tsx:2-3`: `getSession` via barrel, `isAdmin` direct).
   **Fix:** delete the barrel and import concrete modules everywhere (matches
   majority usage), or enforce it via `no-restricted-imports` lint rule and
   migrate all call sites. Don't leave it half-adopted. Category:
   maintainability / YAGNI.

3. (Minor) `package.json`'s `check` script runs
   `checkArchitectureBoundaries.ts` from `node_modules/@chromatis/base/infra/scripts/`,
   not a local `scripts/` dir as `ARCHITECTURE.md` implies. Bundle into fix
   for #1 if ever touching that doc. Category: maintainability (very low
   priority).

### What's good
`core/routes/home.tsx`, `core/content.server.ts`, `core/db.server.ts` are
short, boring, single-purpose — no premature generalization in loaders.
Layer-boundary enforcement via ESLint + custom script is a justified
abstraction at this codebase size, not enterprise-pattern reflex.

---

## Phase 2 — `server/services/*` (done)

Reviewed all 7 files (1,381 LOC): `courseService.ts`, `quizService.ts`,
`userService.ts`, `worksheetService.ts`, `slideService.ts`, `pageService.ts`,
`practiceService.ts`.

### Issues found

1. **`practiceService.ts` is 100% dead code — hardcoded mock, never imported.**
   `getPracticeTasks()` returns two hardcoded placeholder `PracticeTask`
   objects. Confirmed via grep: zero importers anywhere in `src/`.
   `features/practice/routes/practice.tsx` and `PracticeHub.tsx` don't call it.
   **Fix:** delete the file. If the practice feature's data layer isn't built
   yet, leave a one-line TODO comment in `practice.tsx` instead of a
   fake service. Category: YAGNI / dead code.

2. **`quizService.ts` — 6 of 12 exports are dead**, all marked
   `// TODO: wire to route` (lines 309-467): `getActiveQuizForCourse`,
   `getActiveQuizResults`, `getQuizResults`, `getQuizSummary`,
   `listQuizSessions` (+ `QuizSessionMeta` type). Confirmed via grep: zero
   call sites outside their own definitions. That's ~150 of 467 lines.
   **Fix:** delete now; write speculative-route queries only when the route
   actually gets built, against the schema as it exists then. Category:
   YAGNI / dead code.

3. **`courseService.ts` — 4 more dead `// TODO: wire to route` exports:**
   `getCourseDTOs` (L84), `getCourseIdBySubjectId` (L109), `courseListed`
   (L127), `getTopicDTO` (L263). Same pattern, confirmed dead via grep.
   `getCourseIdBySubjectId` even has a 4-line doc comment justifying a
   subtle ordering choice for a function nothing calls. Category: YAGNI /
   dead code.

4. **`as never` / `as unknown as never` casts to smuggle arrays/JSON past
   `postgres` tagged-template types — 3+ different idioms, no shared helper.**
   `courseService.ts:87` (`as unknown as never`), `quizService.ts:152,297`
   (`as never`), `slideService.ts:39` (`as never`), `worksheetService.ts:200`
   (`as DifficultyCause[] | null` — different idiom again). Defeats type
   checking for that argument; a typo'd field would compile silently.
   **Fix:** if this is a known `postgres.js` limitation, wrap once — e.g. a
   `jsonbParam<T>(value: T)` helper in `core/db.server.ts` — and use
   everywhere instead of ad hoc casts per call site. Category: typing.

### What's good
`userService.ts`, `pageService.ts`, `slideService.ts`, and the non-dead half
of `courseService.ts`/`quizService.ts` are clean — SQL in, DTO out, no
unneeded indirection. Audit-log try/catch-and-log pattern is duplicated 2-3
times at ~6 lines each — noted, not flagged as must-fix.

---

## Phase 3 — `core/` routes + `core/auth/` (done)

Reviewed `AppLayout.tsx`, `CourseLayout.tsx`, `group.tsx`, `contentAsset.ts`,
`assets.server.ts`, `nav.ts`, `schema.ts`, and all of `core/auth/`
(`guards.ts`, `login.server.ts`, `session.server.ts`, `types.ts`).

### Issues found

1. **`src/core/schema.ts` (129 lines) is entirely dead — confirmed zero
   importers anywhere in `src/`.**
   Defines `groups`, `subjects`, `courses`, `topics`, `chapters`,
   `worksheets`, `task_responses`, `checkpoint_responses`, `slide_state` via
   a `defineTable()` DSL from `@chromatis/base/schema`, plus derived
   `PgRow<>` types. File header literally claims "Single source of truth for
   the StudyLuma domain schema" and justifies its existence by a speculative
   future feature: "When offline support is added... already structured —
   just wire up the SQLite runtime." But:
   - The **real** schema is hand-written SQL in `sql/migrations/*.sql`
     (confirmed: `1.0.0__initial.sql`, `1.0.1__content_assets.sql`, etc.)
   - Every service hand-types its own row shapes (`CourseRow` in
     `courseService.ts`, `QuizSessionRow` in `quizService.ts`, etc.) instead
     of using this DSL's output.
   - The framework's own migration tooling
     (`node_modules/@chromatis/base/infra/scripts/dbDeploy.ts`,
     `dbMigrations.ts`) does **not** reference or discover `schema.ts` by
     convention — confirmed via grep, no hits.
   This is the clearest YAGNI violation in the codebase so far: speculative
   infra for an unbuilt feature (offline/SQLite sync), disconnected from
   what's actually used, misleadingly labeled as the source of truth.
   **Fix:** delete `src/core/schema.ts` entirely. Revisit only if/when
   offline support becomes real, scheduled work — build the DSL against the
   schema as it exists *then*. Category: YAGNI / dead code.

2. (Minor, resolved by #1) Row-shape duplication between `core/schema.ts`'s
   `defineTable()` output and every service's private `*Row` types is itself
   evidence the DSL was tried and abandoned in practice. No action needed
   beyond deleting `schema.ts`.

### What's good
`AppLayout.tsx`, `CourseLayout.tsx`, `contentAsset.ts`, `assets.server.ts`,
`login.server.ts`, `session.server.ts`, `nav.ts` are all thin and boring —
loaders fetch + assert, components render, no business-logic creep.
`group.tsx`'s "loader always redirects" looked suspicious at first glance but
is a legitimate catch-all for an unmatched `:group` path — not dead code.
`login.server.ts`'s separate IP/username+IP rate-limit buckets with
fail-closed-on-error is reasonable, not overengineered.
`assets.server.ts`'s Postgres/S3 driver switch is justified by the
documented dual-deployment requirement (Cloudflare Workers vs Docker).

---

## Running themes across phases 2-3

**Confirmed dead code so far (verified via grep, zero external call sites):**
- `src/server/services/practiceService.ts` — entire file
- `src/server/services/quizService.ts` — `getActiveQuizForCourse`,
  `getActiveQuizResults`, `getQuizResults`, `getQuizSummary`,
  `listQuizSessions`, `QuizSessionMeta`
- `src/server/services/courseService.ts` — `getCourseDTOs`,
  `getCourseIdBySubjectId`, `courseListed`, `getTopicDTO`
- `src/core/schema.ts` — entire file

All of the above were either explicitly marked `// TODO: wire to route` or
justified by a hypothetical future feature — i.e. speculative code written
ahead of its consumer, then never cleaned up. **Recommended quick win before
the next phase:** project-wide grep for `// TODO: wire to route` to see if
there are more instances in files not yet reviewed (admin, slides, contentpage
services/routes not yet covered).

**Typing smell:** inconsistent `as never` / `as X` casts for array/JSONB
postgres query params across `courseService.ts`, `quizService.ts`,
`slideService.ts`, `worksheetService.ts`. Worth a single shared helper.

---

## Phase 4 — `src/schema/` shared types (done)

Reviewed all 8 files (459 LOC): `accentColors.ts`, `checkpointTypes.ts`,
`courseContent.ts`, `courseTypes.ts`, `page.ts`, `quizTypes.ts`,
`slideTypes.ts`, `streamTypes.ts`.

### Issues found

1. **`slideTypes.ts` — `Slide`, `SlideDeck`, `SlideState`, `SlideMessage`
   (lines 3-13, 117-130) are dead code, superseded by the typed deck format.**
   Confirmed via grep: zero importers anywhere in `src/`. The file itself
   says as much in a comment at line 15 (`// ─── Typed Slide Deck (new slide
   format...) ───`) — `Slide`/`SlideDeck` are the pre-typed-deck format,
   fully replaced by `TypedSlide`/`TypedSlideDeck` (used throughout
   `features/slides`). `SlideState`/`SlideMessage` describe a
   presenter/projector sync shape (`interactiveState`, `pointer`) that was
   superseded by `streamTypes.ts`'s DO-backed `LiveSlideState` /
   `SlideStateEvent` (`macroState`, `revealStep`) — confirmed the latter are
   what `SlideProjector.tsx` and `slideService.ts` actually use over the
   WebSocket stream. **Fix:** delete `Slide`, `SlideDeck`, `SlideState`,
   `SlideMessage` from `slideTypes.ts`. Category: YAGNI / dead code.

2. **`courseService.ts:7-27` re-exports 7 types from `@schema/courseTypes`
   that nothing imports through that re-export.** `export type { CourseId,
   CourseDTO, ProgressStatus, ProgressChapterDTO, ProgressTopicDTO,
   ProgressDTO, SidebarCourseDTO, SidebarDTO, CourseAccessGroups } from
   "@schema/courseTypes"` immediately followed by a separate `import type
   {...}` of the overlapping subset for local use — two statements pulling
   from the same module for different purposes. Confirmed via grep: every
   consumer of `@services/courseService` imports only functions/values
   (`getCourseDTO`, `getSidebarDTO`, etc.) or the unrelated
   `AdminWorksheetRef`; none import `CourseDTO`/`SidebarDTO`/etc. through the
   service barrel. This is the same "barrel half-adopted" pattern flagged in
   Phase 1 (#2) at smaller scale. **Fix:** delete the `export type {...}`
   block; keep only the `import type` needed locally. Category: YAGNI /
   dead code.

### What's good
The DTO/type split is otherwise clean: `courseContent.ts` (static catalog
shape: `Topic`/`Chapter`/`WorksheetRef`) is correctly kept separate from
`courseTypes.ts` (computed per-user view: `ProgressTopicDTO`/`ProgressChapterDTO`)
rather than one type doing both jobs. `quizTypes.ts` and `streamTypes.ts`
are well-documented (header comments explain *who* reads/writes each type
and *when* optional fields populate per quiz phase) and cross-checked
correctly against their `*Row` builders in `quizService.ts` — no drift
found. `page.ts`'s branded `Markdown` type (`unique symbol` +
`createMarkdown()` constructor, page.ts:40-51) is a real, paid-for
abstraction — it stops raw strings from being passed where sanitized/parsed
markdown is expected, and is used consistently rather than bypassed.
`accentColors.ts` and `checkpointTypes.ts` are appropriately tiny — no
over-engineering to critique.

---

## Phase 5 — `src/macros/` (done)

Reviewed all 19 macro folders + `registry.tsx`, `componentTypes.ts`,
`markdownParser.ts`, `codeLanguage.ts` (~1.8k LOC).

### Issues found

1. **`pn` (presenter-note) macro is declared in the type union but has no
   renderer — silently renders nothing if it ever appears in content.**
   `pn/types.ts` defines `PresenterNoteMacro`, imported into `registry.tsx`
   (line 31) and included in the `Macro` union (line 73), but `registry.tsx`'s
   own setup instructions at the top of the file (lines 7-11: "1. Create
   folder... 2. Add type import... 3. Add entry to the macros object") were
   never finished for it — there's no `Renderer.tsx`, no entry in the
   `macros` registry object (lines 86-103), and no importer of
   `PresenterNoteMacro` anywhere else in `src/`. If a `pn` node ever reaches
   `renderMacro()`, `componentMap.get("pn")` is `undefined` and it returns
   `null` with no warning — worse than `ComponentRenderer`'s explicit
   "Unbekannte Komponente" fallback for the same failure mode. Presenter
   notes are in fact handled entirely separately, via `Slide.presenterNotes:
   Markdown[]` (`slideTypes.ts`) consumed by
   `features/slides/components/PresenterNotes.tsx` — confirmed via grep, no
   content pipeline or fixture anywhere references `type: "pn"`. **Fix:**
   delete `pn/types.ts` and its union entry; the real presenter-notes path
   doesn't go through the macro system at all. Category: YAGNI / dead code.

2. **Hint/answer/why footer block is duplicated near-verbatim across 4 task
   renderers** (`textTask/Renderer.tsx:54-74`, `inputTask/Renderer.tsx:105-118`,
   `codeTask/Renderer.tsx:73-92`, `handwrittenTask/Renderer.tsx:74-94`).
   Each one independently does: extract `hint`/`answer`(or `solution`)/`why`
   via `getMarkdown()`, then conditionally wrap a `<Stack gap="sm">` of up to
   3 `CollapsibleSection`s (hint always-visible, answer/why gated on a local
   "checked" flag) — same shape, same prop names (`type="hint"` /
   `"answer"` / `"why"`), differing only in the boolean gate variable name
   and (in `handwrittenTask`) an extra `solutionsUnlocked` gate. The team has
   already extracted this exact kind of repetition once before — see
   `useMacroValue`'s own doc comment, "Replaces the duplicated load/save
   pattern across all input macros" — so the precedent for factoring out
   macro-renderer boilerplate is established, just not applied here.
   **Fix:** extract a shared `<TaskFeedback hint={..} answer={..} why={..}
   showAnswer showWhy />` component (or a `useTaskFeedback()` helper
   returning the JSX) used by all 4. Category: maintainability / YAGNI.

### What's good
The single-purpose display macros (`callout`, `formula`, `note`, `image`,
`table`, `layout`, `quiz`) are appropriately tiny (15-40 lines each) with no
forced abstraction between them — they look superficially similar
(markdown-in-a-styled-div) but each maps to genuinely distinct markup/CSS,
so merging them would add an indirection layer to save nothing.
`registry.tsx`'s auto-derived arrays (`DISPLAY_MACRO_TYPES`,
`INPUT_MACRO_TYPES`, `INTERACTIVE_MACRO_TYPES`) computed once from a single
`macros` object are a justified abstraction — one source of truth, not
speculative. `state/useMacroValue.ts` and `state/useMacroCheck.ts` are
exactly the right shared abstraction: real, paid-for deduplication of
load/save/check logic across every interactive macro, not a premature one.
`component/Renderer.tsx`'s sub-registry (currently 1 entry,
`passwordBruteForce`) mirrors the top-level registry pattern and has an
explicit unknown-component fallback — not over-engineered. No `any`/`as any`
escapes found anywhere in `macros/`.

---

## Phase 7 — `src/ui/components/` (done)

Reviewed all 18 component folders (~1.1k LOC): `AppLink`, `Box`, `Button`,
`Card`, `ConfigableIcon`, `Container`, `FancyGrid`, `Grid`, `IconBox`,
`Input`, `Modal`, `PageHeader`, `Roadmap`, `SectionShell`, `SingleTaskView`,
`Stack`, `WorksheetCards`. Phase 6 (quiz/slides features) skipped for now per
request — note `SingleTaskView` below is quiz-shaped but physically lives
here, so it's in scope.

### Issues found

1. **`"use client"` directive is dead, copy-pasted cruft across the entire
   codebase (75 files, 11 of 18 in `ui/components` alone) — this app has no
   React Server Components.** Confirmed: `package.json` has plain
   `react-router@^7.0.0` + `vite@^7.0.0`, no RSC plugin, no Next.js. `"use
   client"` is a Next.js App Router / RSC boundary marker; React Router v7
   SSR (this app's actual architecture, per the Phase-1 repo description)
   doesn't read it at all — Vite just sees a meaningless string-literal
   expression statement. Distribution makes clear it's leftover from a
   port, not intentional: present on `Stack`, `Button`, `Box`, `Card`,
   `Modal`, `Grid`, `FancyGrid`, `Container`, `AppLink`, `ConfigableIcon`,
   `SingleTaskView`, `SectionShell`, `Roadmap`, `Input`, absent on
   `PageHeader`, `IconBox`, `WorksheetCard(s)` — no principled line between
   the two groups (e.g. `Box` has it, the equally presentational `IconBox`
   doesn't). Corroborated by `Button.tsx:50`'s stale comment "Use regular
   anchor for hash links, Next.js Link for routes" — this is React Router's
   `Link`, not Next.js's. **Fix:** delete every `"use client"` line
   project-wide (`grep -rl '"use client"' src | xargs sed -i '/"use client";/d'`
   plus a blank-line cleanup pass), and fix the stale comment in
   `Button.tsx`. Category: YAGNI / dead code (cross-cutting, not just this
   phase's scope, but discovered here).

2. **`SingleTaskView` is entirely dead code — confirmed zero importers
   anywhere in `src/`.** 224 lines (the single largest file in this phase)
   implementing a full single-question MCQ view: timer countdown, distribution
   bars, reveal phases, German hardcoded strings ("Antwort abschicken",
   "Zeit abgelaufen", "Quiz startet gleich…", "Erklärung" — also the only
   component in this folder with hardcoded German instead of going through
   `ui.de.json`, suggesting it predates that pattern or was abandoned before
   migrating to it). The shape (phases, `optionCounts`, `correctIndices`,
   `why`) closely mirrors `quizTypes.ts`/`streamTypes.ts` (Phase 4) but
   nothing in `features/quiz` imports it — that feature has its own render
   path. **Fix:** delete `SingleTaskView/` entirely; if quiz UI is later
   rebuilt, build it directly inside `features/quiz` against the live
   state shape, not a speculative pre-built shared component. Category:
   YAGNI / dead code.

3. **`Button.tsx:49-57` reimplements hash-link handling that `AppLink`
   already does, and currently exercises zero call sites.** `Button`
   special-cases `href.startsWith("#")` to render a raw `<a>` instead of
   delegating to `AppLink` for every href — but `AppLink` (used for the
   non-hash branch right below) already contains this exact check via
   `isHashHref()` (`@ui/lib/links.ts:7-9`) and would produce the same `<a>`
   render. Confirmed via grep: no `<Button href="#...">` call site exists
   anywhere in `src/` today, so the branch is both redundant logic and
   currently untested/unexercised. **Fix:** delete the special case, always
   render `<AppLink href={href} className={buttonClass}>`. Category:
   YAGNI / anti-pattern (duplicated logic that already lives one layer down).

### What's good
Most of this folder is exactly what a UI primitive layer should look like:
`Box`, `Stack`, `Grid`, `Container`, `PageHeader`, `IconBox` are tiny,
single-purpose, boring `clsx`-plus-CSS-module wrappers with no logic to get
wrong. `AppLink` correctly centralizes the external/hash/internal-route
branching that `Button` then partially (incorrectly) duplicates — see issue
3. `ConfigableIcon`'s module-level `Map` cache for dynamically-imported
Lucide icons is a reasonable, justified abstraction (avoids re-importing the
same icon chunk on every mount) with correct cleanup (`cancelled` flag in the
effect). `Roadmap` (265 lines, the largest *live* component) is well
decomposed into `RoadmapTopic`/`RoadmapBullet`/`RoadmapChapter` sub-components
with a clear, single state concern (`expandedTopics`); its dual-mode
behavior (navigable links vs. `onChapterSelect` callback for admin selection
UIs) is genuinely used both ways (`Coursepage.tsx`, `ProgressControl.tsx`),
not speculative. `FancyGrid` + `useResponsiveCols` + `fancyGrid.ts`
(`fancyRows`/`chunkBySizes`) cleanly separate measurement, row-sizing math,
and rendering — each piece independently testable, no over-abstraction.
`Input`'s label/hint/helperText/error layout is a real, paid-for
consolidation (used in `AccessSection.tsx`) rather than a wrapper-for-its-own-sake.

(Minor, not flagged as must-fix: `Roadmap` and `WorksheetCard` are the only
two components using `export default` + re-export-as-named in their
`index.ts`, while every other component folder exports named directly from
the component file. Cosmetic inconsistency, not worth a dedicated fix pass.)

---

## Phase 8 — `admin`, `access`, `practice`, `demo`, `contentpage` (done)

Reviewed `admin` (8 files), `access` (6 files), `practice` (3 files), `demo`
(provider + session + entry route) in full; `contentpage`'s storage layer
(`WorksheetStorage.ts`, `SyncManager.ts`) spot-checked as the highest-risk
stateful code in that folder — the rest of `contentpage` (CodeRunner,
MarkdownRenderer, macro-adjacent renderers) not exhaustively reviewed.
`quiz`/`slides` themselves remain skipped per request, but findings below
surfaced real, confirmed dependencies on/from them.

### Issues found

1. **The architecture-boundary ESLint rule (`boundaries/element-types`) does
   not actually fire — confirmed empirically, not just by inspection.**
   Phase 1 called this enforcement "a justified abstraction... not
   enterprise-pattern reflex." Testing it directly: created a file in
   `src/ui/` importing a `features/homepage` component two ways — once via
   the `@features/...` path alias, once via a plain relative path
   (`../features/homepage/...`) — and ran `npx eslint` on each. **Zero
   diagnostics in both cases**, despite the config (`eslint.config.mjs:116-119`)
   explicitly stating `from: "ui", disallow: ["app", "features", "server",
   "server-actions"]`. Confirmed the eslint config itself loads correctly and
   other rules in the same run do fire (`no-restricted-imports` correctly
   flagged a test `import postgres from "postgres"`), so this isn't a broken
   config file — specifically the boundaries rule is inert. Likely cause:
   `eslint-plugin-boundaries` needs to resolve each import specifier to an
   actual file to classify its element type, and without resolver settings
   (no `settings['import/resolver']` or `boundaries/root-path` configured in
   `eslint.config.mjs`), it silently fails to resolve and skips the check
   rather than erroring loudly. **Impact:** every "features are isolated"
   claim about this codebase (Phase 1, this phase's issue 2 below) currently
   relies on developer discipline alone — nothing technical is enforcing it.
   **Fix:** add proper resolver settings for `eslint-plugin-boundaries`
   (check its docs for the v5 resolver config, likely an `eslint-import-resolver-typescript`
   entry under `settings`), then re-run lint to see the real current
   violation count — there will likely be more once it actually works.
   Verify the fix the same way this was found: write a deliberately-bad
   cross-feature import and confirm it now errors. Category: correctness
   (the most consequential finding so far — a safety net the team believes
   exists does not).

2. **Seven single-symbol re-export barrels at `src/ui/*.ts` (not
   `ui/components/`) exist solely to launder cross-feature imports through
   the `ui` boundary type, contradicting the documented "features isolated
   from each other" rule — and confirmed live, not dead.** Found:
   `CourseCard.ts`, `SlideSelection.ts`, `SlideHeader.ts`, `CodeRunner.ts`,
   `useTsRunner.ts`, `ContentPageRenderer.ts`, `MarkdownRenderer.ts` — each a
   single line, e.g. `export { CourseCard } from
   "@features/homepage/sections/CourseSection/CourseCard"`. Confirmed
   real consumers in *other* features via grep: `features/access/CoursePicker.tsx`
   imports `@ui/CourseCard` (→ `features/homepage`), `features/admin/AdminCourseDetail.tsx`
   imports `@ui/SlideSelection` (→ `features/slides`), `features/quiz/QuizProjectorOverlay.tsx`
   imports `@ui/SlideHeader` (→ `features/slides`), 8 files across
   `features/slides/components/` import `@ui/MarkdownRenderer` (→
   `features/contentpage`). This is exactly the kind of dependency the
   boundary rule (issue 1) is supposed to catch and doesn't — these barrels
   predate or anticipate that gap, rather than being legitimate shared `ui`
   components. **Fix:** decide deliberately — either these cross-feature
   dependencies are acceptable (promote the underlying components to actual
   `ui/components/` or a new shared layer, with real ownership there) or
   they're not (inline the logic per-feature, accepting duplication, or
   restructure feature boundaries). Don't leave the boundary technically
   violated while the lint rule that's supposed to flag it is silently
   broken. Category: anti-pattern / maintainability.

3. **`practiceAvailability.ts`'s `isPracticeAvailable()` is dead code —
   confirmed zero callers anywhere in `src/`, not even within `practice.tsx`
   itself.** Unlike `PracticeHub.tsx`'s mock data (which *is* rendered,
   behind an explicit "Work in Progress" banner — that's intentional,
   self-documenting WIP, not flagged here), this function is defined,
   exported, documented with a 20-line header comment, and never called by
   anything — the route doesn't gate on it. Same shape as `practiceService.ts`
   (Phase 2, issue 1): speculative code for a feature gate that was never
   wired up. **Fix:** delete the file until something actually calls it.
   Category: YAGNI / dead code.

4. **`NewUserWelcomeModal.tsx` is dead code — confirmed zero importers.**
   A 26-line wrapper around `UsernameModal` for a "new user, here's your
   generated username" flow; nothing in `src/` renders it. **Fix:** delete,
   or wire it into the registration success path in `access.tsx`'s `action`
   (`mode === "course-pin"` branch, `routes/access.tsx:211-219`) if that's
   the intended flow — the `buildNewUserUsernameCookie` call there suggests
   this modal was meant to consume that cookie but the wiring was never
   finished. Category: YAGNI / dead code.

5. **`routes/access.tsx`'s `fail()` error messages are hardcoded English
   ("Please enter your credentials.", "Invalid credentials.", "Invalid
   course link.", "Registration window not open.", "Failed to enroll in
   course.") shown directly to users via `toast.error`/`setError` in
   `AccessSection.tsx`, while every other string in this feature goes
   through `access.de.json`.** This is the only feature-facing user flow
   reviewed so far with English strings reaching a German-speaking user.
   **Fix:** move these into `access.de.json` alongside the rest of the
   section's copy. Category: correctness (i18n gap, not a crash, but visibly
   wrong for every error path in login/registration).

6. **The `isDemoMode ? <local override> : <real postAdminAction>` branch is
   duplicated near-identically 6 times across `admin/`** (`ProgressControl.tsx`,
   `RegistrationControl.tsx` ×2 for open/close, `WorksheetManagement.tsx` ×2
   for worksheet/solution visibility, `WorksheetMonitor.tsx`). Each site
   independently does: check `isDemoMode`, call the matching
   `useDemoOverrides()` setter and return early, else `startTransition` →
   `postAdminAction` → toast on failure. Same shape every time, just
   different intent strings and setters. **Fix:** a small `useAdminAction(demoFn,
   intent, payload)` hook (or similar) in `admin/` that encapsulates the
   branch once. Not urgent — each site is short and the duplication is
   shallow — but if a 7th admin control gets added, factor it out then.
   Category: maintainability (low priority).

### What's good
`admin/` is otherwise clean: `AdminDashboard`, `AdminCourseDetail`,
`routes/admin.tsx`, `routes/adminCourseDetail.tsx`, `routes/api.tsx` are all
boring loader/action/render code with no business logic leaking into routes.
`routes/access.tsx`'s `action()` correctly threads three distinct auth modes
(normal login / course-join-with-existing-account / course-join-new-registration)
through one switch without collapsing them into a falsely-unified abstraction.
`contentpage/storage/SyncManager.ts` and `WorksheetStorage.ts` are the best-
documented files reviewed in this entire pass — `SyncManager`'s two-timer
debounce/max-interval design and failure-merge-back-into-dirty logic is
genuinely subtle and the header comment explains exactly why each piece
exists; `WorksheetStorage`'s versioned-migration `loadState()` (dropping the
old `checkpoints` field, introducing `submittedSections`) shows real care
about not breaking existing users' localStorage. Neither over- nor
under-engineered for what they do.

---

## Summary across all phases

This review covered the full `src/` tree except `features/quiz` and
`features/slides` internals (skipped per request, though their *external*
dependencies surfaced in Phase 8, issue 2). Running themes:

- **Dead code from unfinished features**, consistently marked or inferable
  (`// TODO: wire to route`, "Work in Progress" banners, zero grep hits):
  `practiceService.ts`, `practiceAvailability.ts`, `core/schema.ts`, 10 dead
  exports across `quizService.ts`/`courseService.ts`, dead types in
  `slideTypes.ts`, `SingleTaskView`, `NewUserWelcomeModal`, the `pn` macro.
- **Leftover Next.js-era cruft**: `"use client"` in 75 files (inert under
  React Router v7) (fixed), a stale "Next.js Link" comment in `Button.tsx`.
- **Architecture-boundary enforcement is aspirational, not real** (Phase 8,
  issue 1) — the single most consequential finding, since several other
  findings (the `ui/*.ts` barrels, half-adopted `core/index.server.ts`
  barrel from Phase 1) are downstream symptoms of nothing actually checking
  feature isolation.
- **What's consistently good**: service layer SQL-in/DTO-out discipline,
  `ui/components` primitives, DB/localStorage sync logic
  (`WorksheetStorage`/`SyncManager`), and route loader/action hygiene
  throughout — none of the "what's good" call-outs were filler, each phase
  had genuinely well-scoped code alongside the issues.
