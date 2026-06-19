# Content Format — Changes and Roadmap

This document tracks the delta between the old content format (IST) and the current specification (SOLL), and records postponed ideas for future implementation.

---

## Breaking Changes (IST → SOLL)

### 1. Task type aliases removed

The following aliases no longer exist. Use only the canonical name.

| Removed alias | Use instead |
|---------------|-------------|
| `## text-task:` | `## text:` |
| `## code-task:` | `## code:` |
| `## multiple-choice:` | `## mcq:` |
| `## gap-task:` | `## gap:` |

Existing content files using aliases must be migrated.

---

### 2. `### solution` renamed to `### answer`

Affects `text` and `code` task types. The semantics are unchanged — it contains the model answer or sample solution.

```diff
- ### solution
+ ### answer
```

Rationale: `answer` is semantically correct for all task types (both closed and open) and is the term used in the new task types (`input`, `spot-error`, etc.).

---

### 3. `# Checkpoint` / `# Challenges` magic strings removed

Special section names are no longer recognised. Use `@checkpoint` and `@challenge` modifiers instead. No backwards compatibility — the old names break silently (they become plain sections).

```diff
- # Checkpoint
+ @checkpoint
+ # Überprüfe dich selbst

- # Challenges
+ @challenge
+ # Knobelaufgaben
```

---

### 4. MCQ option syntax changed

`mcq` tasks now use round brackets, consistent with `single-choice`.

```diff
- - [x] Correct option
- - [ ] Incorrect option
+ - (x) Correct option
+ - ( ) Incorrect option
```

`single-choice` syntax is unchanged (`(x)` / `( )`). The visual difference between single and multiple selection is determined by the task type keyword, not the option syntax.

---

## New Task Types

### `## input: Title`

Structured numeric input task. The student fills predefined fields (number, vector, fraction, power) using a numeric keypad. See `MARKDOWN_CONTENT_FORMAT.md` for the full `### answer` format specification.

Rationale: enables digital validation of numeric results without requiring a math keyboard. Designed for Checkpoint tasks and short result checks on tablets.

### `## spot-error: Title`

Error identification task using the same `( )` / `(x)` option syntax as `single-choice`. The author marks the erroneous step with `(x)`. Exactly one error per task.

Rationale: supports targeted work on misconceptions. MCQ-style interaction is tablet-friendly and consistent with other selection tasks.

### `## match: Title`

Matching task with a `left:` and `right:` list. Correct pairs are defined by position (index). The right column is shuffled on display. Items can contain math or images.

Rationale: covers function ↔ derivative, concept ↔ definition, and similar pairing tasks that would otherwise require awkward MCQ workarounds.

### `## classify: Title`

Classification task. Categories are defined with `[Category Name]` markers; items are listed beneath. All items are shuffled and presented ungrouped. Feedback is shown after "Prüfen". Items can contain math or images.

Rationale: covers term types, equation types, graph shapes, and other categorization tasks that cannot be expressed cleanly as MCQ.

### `## task: Title`

Handwritten task. Always generates a PDF for the student to work on (paper, GoodNotes, etc.). Supports `### hint` and `### answer` (model solution shown after completion). Not automatically validated.

Rationale: long open calculations, derivations, and sketches belong on paper or in a note-taking app. StudyLuma provides the task, hints, and model solution; the student works in their preferred medium.

---

## New Subsections

### `### why`

Optional subsection for all task types. Shown after the student submits or checks their answer. Explains the underlying principle or the source of a common mistake — not just the correct answer.

Differs from `### hint`: `hint` is shown *before* submission on request; `why` is shown *after* checking automatically.

Particularly useful for: `mcq`, `single-choice`, `input`, `spot-error`, `match`.

---

## New Modifiers

### `@tolerance <value>`

Applies to `input` tasks with a `number:` answer. Allows a numeric margin of error.

```markdown
@tolerance 0.01
## input: Näherungswert
...
### answer
number: 0.33
```

---

## Behavioral Definitions (now explicit in the format)

### Checkpoint

- Tasks must be digitally validatable: `input`, `mcq`, `single-choice`, `spot-error`, `match`, `classify`, `gap`
- No `text`, `code`, or `task` tasks in Checkpoints
- Every task gives direct feedback on submission

### @challenge

- Open-ended, creative, or demanding tasks
- Do not need to be automatically validatable
- Primary medium is PDF / handwritten (`task` type)
- StudyLuma provides task description, hints, and model solution
- Must not be artificially forced into closed-answer formats

### Normal Sections

- Hybrid: short tasks can be solved directly in StudyLuma; longer calculations use `task` (PDF)
- After a `task` block, a short `input` or `mcq` checkpoint can follow to verify the result
- `input` should only be used for final results or specific intermediate values, not full derivations

---

## PDF Generation Requirements

### Generation approach

PDFs are generated **build-time in the `studyluma-content` pipeline** using `@react-pdf/renderer` with KaTeX SVG for math rendering. No browser or Chrome dependency.

**Why build-time:**
The website can deploy to Cloudflare Workers, which cannot run Chrome or native binaries. Build-time generation stores PDFs in the AssetStore (identical to images), and the website serves them via the existing `/content-assets/:key` route — no new website infrastructure needed.

**Why React PDF + KaTeX SVG:**
- KaTeX renders any LaTeX expression to SVG via `katex.renderToString(..., { output: "svg" })`
- SVGs are embedded in the PDF as vector graphics — visually identical to the website
- `@react-pdf/renderer` runs natively in Bun, no external tools
- Grid patterns (`@grid squares/lines/free`) are drawn programmatically with rect/line primitives

**Pipeline step** (after `deployContentPages`):
1. Identify all `@pdf` sections across all parsed pages
2. Render each section to PDF bytes (React PDF + KaTeX SVG)
3. Upload to AssetStore (content-addressed by hash — unchanged PDFs are not re-uploaded)
4. Store asset key in DB alongside the content page

---

### Platform-specific open button

The StudyLuma worksheet page shows a button to open the PDF. The button adapts to the platform:

- **iOS (iPad / iPhone):** "In GoodNotes öffnen" — uses the GoodNotes URL scheme:
  `goodnotes://open?url=<encoded-pdf-url>`
  Tapping this hands the PDF directly to GoodNotes without a download step.
- **All other platforms:** "PDF herunterladen" — standard `<a download>` link to `/content-assets/:key`.

Detection is done client-side via user agent (`navigator.userAgent` contains `iPad` or `iPhone`). The download link should always be present as fallback (e.g. hidden visually on iOS but available if GoodNotes is not installed).

---

### Return link footer

Every page of the generated PDF includes a footer with a clickable hyperlink. URL format:

```
https://studyluma.de/w/<contentKey>
```

The `/w/:contentKey` route is a **redirect router** on the website (see Architecture). It resolves the student's enrolled course at request time and redirects to the correct course-specific worksheet URL. The PDF URL therefore never encodes a specific course — it remains stable across course restructuring.

The footer appears on **every page**, not just the last, since students may navigate back from any point in GoodNotes.

Rough design: a bordered box in the page footer with the StudyLuma wordmark and the `/w/...` URL.

---

### Seitenumbruch ohne Orphans

The `@space` values (`s`, `m`, `l`, `page`) are layout hints, not fixed pixel heights. The PDF renderer must:

1. Calculate remaining space on the current page.
2. Check whether the task header + its `@space` work area fits.
3. If not → start the task on a new page.
4. `page` always forces a page break before the task.

Work areas expand to fill remaining page height so pages are always fully used and no task header is orphaned from its content.

---

## Parser Implementation Gaps (Code IST → SOLL)

Findings from reading `pipeline/markdownParser/convertAstToBlocks.ts`.

### MacroGroup already exists

Task grouping is already implemented. Consecutive task blocks with no `---` between them are automatically collected into a `MacroGroup`. A `thematicBreak` (`---`) flushes the current group and starts a new one. No parser change needed for the group mechanism itself — only the UI labeling (1, 1a, 1b, 2…) needs to be added on the rendering side.

### Gap syntax: `[...]` → `((...))` — code must change

The parser currently matches `[word|alt1|alt2]` (single square brackets, line 348). The SOLL format uses `((word | alt1 | alt2))` (double parentheses). All existing gap content files use the old syntax and must be migrated.

```diff
- Ein ((Grenzwert | Limes)) existiert, wenn...
+ Ein [Grenzwert|Limes] existiert, wenn...   ← current code
```

Parser regex to update: `/(?<!!)\[([^\]\n]*)\](?!\()/g` → match `\(\(([^)]*)\)\)` instead.

### MCQ option syntax: `[x]`/`[ ]` → `(x)`/`( )` — code must change

The parser matches `- [x]` and `- [ ]` (line 301). SOLL uses `- (x)` and `- ( )`. All existing MCQ/single-choice content files must be migrated.

```diff
- firstOptionIndex = lines.findIndex((line) => /^-\s*\[[xX ]\]\s+/.test(line.trim()));
+ firstOptionIndex = lines.findIndex((line) => /^-\s*\(([xX ])\)\s+/.test(line.trim()));
```

### `### solution` → `### answer` — code must change

`normalizeTaskSubsection()` (line 416) maps to `"hint" | "solution" | "starter" | "validation"`. The key `"solution"` must be renamed to `"answer"` and the schema type updated. All content files using `### solution` must be migrated.

### `single-choice` already handled correctly

`single-choice` maps to `{ kind: "mcq", single: true }` (line 230). No parser change needed — the single/multi distinction is already a property on the mcq macro, not a separate type.

### New task types — not yet in parser

The following task type keywords need cases in `normalizeTaskToken()`:

| Token | New kind |
|-------|----------|
| `input` | `inputTask` |
| `spot-error` | `spotError` |
| `match` | `matchTask` |
| `classify` | `classifyTask` |
| `task` | `handwrittenTask` |

Each needs a corresponding `parseXxxTask()` function and a new branch in `parseTaskBlock()`.

### New subsection `### why` — not yet in parser

`normalizeTaskSubsection()` does not recognise `"why"`. Add it alongside `"hint"` and `"answer"`.

### New modifiers — not yet in parser

`normalizeModifier()` needs new cases: `"pdf"`, `"space"`, `"grid"`, `"tolerance"`. The `"pdf"` modifier applies to section headings (not tasks), so `convertAstToBlocks()` must check for it before flushing a section. The `"space"` and `"grid"` modifiers are task-level and feed into the PDF renderer rather than the schema macro.

---

## Postponed / Future Ideas

### `## step-by-step: Title`

Progressive disclosure task. The student selects the next correct step from a set of options; after each correct selection the step is revealed and the next choice is presented.

Deferred because: complex to specify in Markdown and complex to implement in the renderer. High didactic value for introducing new topics step by step.

Rough syntax sketch (not final):
```markdown
## step-by-step: Gleichung lösen

Löse $2x + 4 = 10$.

step:
- (x) Subtrahiere 4 auf beiden Seiten: $2x = 6$
- ( ) Dividiere durch 2: $x = 5$
- ( ) Addiere 2: $2x + 6 = 10$

step:
- (x) Dividiere durch 2: $x = 3$
- ( ) Multipliziere mit 2: $x = 12$
```

Open design question: what happens on a wrong selection? Immediate negative feedback + retry, or allow multiple attempts silently?

---

### Math keyboard input (MathLive / MathQuill)

Currently `input` tasks are limited to numeric values, vectors, fractions, and powers. Full term input (e.g. $2x + 1$, $\frac{d}{dx}(x^2)$) is not supported.

Future option: integrate MathLive or MathQuill for a touch-friendly math keyboard. This would unlock `input` tasks for symbolic answers.

Current workaround: represent symbolic-answer questions as `single-choice` or `mcq` instead.

---

### `@tags` modifier

```markdown
@tags["ableitung", "potenzregel", "konstantenregel"]
## input: ...
```

Intended for the future Practice module — adaptive exercises, deficit detection, and thematic filtering. Not relevant for worksheets in the current scope.

When implemented: tags should supplement, not replace, the path/section hierarchy which serves as a coarse topic classifier already.

---

### Interactive function graphs

Inline graph component for rendering and exploring function graphs directly on the page. Candidate libraries: Mafs (React), GeoGebra applets (iframe).

Would require a new block syntax, e.g.:

```markdown
@graph
$$f(x) = x^2 - 2x + 1$$
```

Deferred because: significant rendering complexity, unclear interaction model on tablet, and not required for the current content.

---

### GeoGebra applet embeds

Inline interactive geometry/algebra applets via GeoGebra iframe. Useful for visualising loci, transformations, and constructions.

Deferred: dependency on external service, limited offline/PDF fallback.

---

### Match task distractors

Currently `match` tasks require equal-length `left` and `right` lists. Adding extra wrong options to the right column (distractors with no left-side pair) would increase difficulty.

Planned extension: allow `right` to have more items than `left`. The surplus items are distractors. Matching remains position-based for the first N items; surplus items are marked as distractors in a way that is not visible to the parser (possibly a trailing comment or a `distractors:` sub-list).

