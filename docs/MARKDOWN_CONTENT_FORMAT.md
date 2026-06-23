# Markdown Content Format

This document describes the Markdown syntax supported by the StudyLuma content pipeline (`studyluma-content`). All worksheet and slide deck files are written in this format.

---

## File Structure

Every content file starts with a YAML frontmatter block:

```markdown
---
title: "Sekanten und Änderungsraten"
type: worksheet
---

Content starts here.
```

Required frontmatter fields:

| Field | Description |
|-------|-------------|
| `title` | Page title (string) |
| `type` | `worksheet`, `slides`, or `overview` |

---

## Sections

H1 headings (`#`) define top-level sections. Each section becomes a discrete block in the rendered page.

```markdown
# Aufgaben

More tasks here...
```

### Subheadings

H2 headings (`##`) that are not task headings (see below) render as section subheadings:

```markdown
# Hauptabschnitt

## Unterabschnitt

Content under the subheading...
```

---

## Standard Markdown

All standard Markdown syntax is supported:

```markdown
**Bold text**
*Italic text*
`inline code`
[Link text](https://example.com)

- Bullet list item
- Another item

1. Numbered list
2. Second item
```

---

## Math

Inline math uses single dollar signs; block math uses double. The content
between the delimiters is **Typst math syntax** (not LaTeX) - see
[typst.app/docs/reference/math](https://typst.app/docs/reference/math) for the
full reference:

```markdown
The derivative $f'(x)$ of a polynomial...

$$
f'(x) = lim_(h -> 0) frac(f(x+h) - f(x), h)
$$
```

Vectors and matrices use Typst's native `vec(...)` / `mat(...)` functions
directly - no custom macros needed:

```markdown
$arrow(x) = vec(1, 2, 0) + t dot vec(2, -1, 3)$
```

Math is precompiled to SVG at publish-time (one Typst CLI compile per unique
span, content-addressed by hash) and served as a static `/content-assets/*.svg`
image - see `docs/CONTENT_PIPELINE.md`. There is no live KaTeX/MathJax
rendering anymore.

---

## Code Blocks

Standard fenced code blocks with syntax highlighting:

````markdown
```typescript
function greet(name: string): string {
  return `Hello, ${name}!`;
}
```
````

### Interactive Code Runner

Add `runner` to the code fence meta to make the block executable:

````markdown
```typescript runner
let x = 5;
console.log(x * 2);
```
````

Students can edit and run this code directly in the browser.

---

## Callout Blocks

Blockquotes whose first line is a recognised keyword become styled callout cards:

```markdown
> concept
> A **derivative** is the instantaneous rate of change of a function.

> warning
> Remember to check whether the function is differentiable at this point.

> highlight
> This formula is on the formula sheet — you do not need to memorise it.

> check
> Make sure you simplify the expression before differentiating.
```

Supported keywords: `concept`, `warning`, `highlight`, `check`.

A blockquote without a recognised keyword renders as a plain callout:

```markdown
> Any other blockquote content renders as a plain note.
```

---

## Task Blocks

Tasks are defined with an H2 heading using the pattern `## task-type: Optional title`.

Recognised task types:

| Heading | Task rendered |
|---------|--------------|
| `## code: Title` | Code editor task |
| `## mcq: Title` | Multiple-choice (multiple correct answers allowed) |
| `## single-choice: Title` | Single-choice (exactly one correct answer) |
| `## gap: Title` | Gap-fill / cloze task |
| `## input: Title` | Structured numeric input task |
| `## spot-error: Title` | Error identification task |
| `## match: Title` | Matching task (left column ↔ right column) |
| `## classify: Title` | Classification task (items into categories) |
| `## task: Title` | Handwritten task — always generates a PDF |

Tasks within a section are automatically grouped together.

### Task Subsections

Inside a task block, H3 headings (`###`) define optional subsections:

| Subsection | Purpose |
|------------|---------|
| `### hint` | Collapsible hint shown before submission — a thinking prompt, not the full answer |
| `### answer` | Model answer or expected value, shown after submission or used for validation |
| `### why` | Explanation shown after checking — explains the principle or common mistake, not just the answer |
| `### starter` | Initial code for `code` tasks (pre-filled in the editor) |
| `### validation` | Validation code for `code` tasks (must return `true` to pass) |

`### why` is especially useful for `mcq`, `single-choice`, `input`, `spot-error`, and `match` tasks where understanding the reasoning matters.

---

### Code Task

````markdown
## code: Quadratische Funktion

Implementiere eine Funktion, die eine quadratische Funktion auswertet.

### starter

```typescript
function quadratic(a: number, b: number, c: number, x: number): number {
  // TODO: implement
}
```

### hint

Use the formula $ax^2 + bx + c$.

### answer

```typescript
function quadratic(a: number, b: number, c: number, x: number): number {
  return a * x * x + b * x + c;
}
```

### validation

```typescript
quadratic(1, 0, 0, 3) === 9 && quadratic(1, -2, 1, 1) === 0
```
````

---

### Multiple Choice

Correct options are marked with `(x)`, incorrect with `( )`. Multiple options can be correct.

```markdown
## mcq: Ableitungsregeln

Welche der folgenden Aussagen sind korrekt?

- (x) Die Ableitung von $x^2$ ist $2x$.
- ( ) Die Ableitung von $x^2$ ist $x^2$.
- (x) Die Ableitung einer Konstante ist $0$.
- ( ) Die Ableitung von $\sin(x)$ ist $-\cos(x)$.

### why

Die Kettenregel wird hier nicht benötigt — alle Terme sind einfache Standardableitungen.
```

---

### Single Choice

Exactly one option is correct, marked with `(x)`.

```markdown
## single-choice: Tangentensteigung

An welcher Stelle hat $f(x) = x^2$ die Steigung $4$?

- ( ) $x = 1$
- (x) $x = 2$
- ( ) $x = 4$

### why

$f'(x) = 2x$, also $2x = 4 \Rightarrow x = 2$.
```

---

### Gap Fill

Gaps are marked with `((...))`. Inside the gap, alternatives are separated by `|`. The **first** alternative is the correct answer; the others are distractors.

```markdown
## gap: Lückentext

Ein Grenzwert existiert, wenn der linksseitige und der rechtsseitige
((Grenzwert | Limes | Funktionswert)) ((übereinstimmen | gleich sind)).
```

---

### Input Task

The student fills in a structured numeric answer. The `### answer` block specifies the expected value and the input template that will be rendered.

Supported answer formats:

| Format | Rendered template |
|--------|------------------|
| `number: 17` | Single number field |
| `vector: 2, -1, 3` | Vector template with N number fields |
| `fraction: 3, 4` | Fraction template (numerator / denominator) |
| `power: 2, 3` | Power template (base / exponent) |

The student interacts with a numeric keypad — no keyboard required.

Use `@tolerance` to allow a numeric margin for decimal answers.

```markdown
## input: Ergebnis

Berechne $f(3)$ für $f(x) = 2x^2 - 1$.

### answer
number: 17

### hint

Setze $x = 3$ in die Funktion ein und vereinfache.

### why

$f(3) = 2 \cdot 3^2 - 1 = 18 - 1 = 17$
```

```markdown
## input: Kreuzprodukt

Berechne $\vec{u} \times \vec{v}$ für $\vec{u} = (1, 0, 0)$ und $\vec{v} = (0, 1, 0)$.

### answer
vector: 0, 0, 1
```

```markdown
@tolerance 0.01
## input: Näherungswert

Berechne $\frac{1}{3}$ auf zwei Dezimalstellen gerundet.

### answer
number: 0.33
```

---

### Spot Error

The student identifies which step in a list contains the error. Mark the erroneous item with `(x)`, all others with `( )`. There is exactly one error per task.

```markdown
## spot-error: Fehler in der Ableitung

Welcher Schritt enthält den Fehler?

- ( ) $f(x) = 3x^2 + 2x$
- ( ) $f'(x) = 6x + 2$
- (x) $f''(x) = 6x$
- ( ) Also ist $f''(0) = 0$

### why

Die Ableitung von $6x$ ist $6$, nicht $6x$. Schritt 3 ist daher falsch.
```

---

### Match Task

The student matches each item in the left column to one item in the right column. Items are defined as two separate lists under `left:` and `right:` labels. The correct pairing is determined by position: `left[i]` matches `right[i]`. The right column is shuffled when displayed.

```markdown
## match: Funktion und Ableitung

Ordne jeder Funktion ihre Ableitung zu.

left:
- $x^2$
- $\sin(x)$
- $e^x$
- $\ln(x)$

right:
- $2x$
- $\cos(x)$
- $e^x$
- $\frac{1}{x}$
```

Items can contain inline math or images.

---

### Classify Task

The student assigns items to categories. The renderer shuffles all items and presents them ungrouped. Feedback is shown after the student clicks "Prüfen".

**Parsing rule:** inside a `classify` block, any paragraph immediately followed by a bulleted list is treated as a category header. Everything before the first such pattern is intro text. Do not end intro text with a list — that would be parsed as a category.

```markdown
## classify: Termarten

Ordne die Terme den richtigen Typen zu.

Monom
- $3x^2$
- $5xy$

Polynom
- $x^2 + 2x + 1$
- $4x^3 - x$

Kein algebraischer Term
- $\sqrt{x + 1}$
- $\frac{1}{\sin(x)}$
```

Items can contain inline math or images:

```markdown
## classify: Graphentypen

Monoton steigend
- ![](./assets/graph-a.png)

Monoton fallend
- ![](./assets/graph-b.png)

Nicht monoton
- ![](./assets/graph-c.png)
```

---

### Task (PDF Handwriting)

Marks a task intended for handwritten work. Always generates a PDF. On iOS, a "In GoodNotes öffnen" button is shown; on other platforms, a download link.

Use this for open-ended calculations, sketches, derivations, and longer problem-solving that cannot be meaningfully validated digitally.

```markdown
## task: Gleichungssystem lösen

Löse das folgende Gleichungssystem auf dem Arbeitsblatt.

$$
\begin{cases}
2x + y = 7 \\
x - y = 1
\end{cases}
$$

### hint

Addiere beide Gleichungen, um $y$ zu eliminieren.

### answer

$x = \frac{8}{3},\quad y = \frac{5}{3}$
```

---

## Task Groups and Separators

Consecutive task blocks without a `---` between them form a **task group** and are displayed together. A horizontal rule (`---`) ends the current group and starts a new independent one.

```markdown
## task: Erste Aufgabe

Beantworte die erste Frage.

---

## task: Zweite Aufgabe

Diese Aufgabe ist unabhängig von der ersten.
```

### Sub-tasks

Multiple `## task:` blocks in the same group (no `---`) become sub-tasks. In `@pdf` sections, the separator determines the numbering hierarchy shown on StudyLuma:

- Each `---`-separated group → numbered main task (1, 2, 3 …)
- Multiple tasks within one group → lettered sub-tasks (1a, 1b, 1c …)
- A group with a single task → number only, no letter

```markdown
@pdf
# Aufgaben

## task: Nullstellen berechnen        ← Aufgabe 1a

Berechne die Nullstellen von $f(x) = x^2 - 4$.

@space l
@grid free
## task: Graphen skizzieren           ← Aufgabe 1b

Skizziere $f$ im Koordinatensystem.

---

## task: Ableitung berechnen          ← Aufgabe 2
```

StudyLuma shows one "In GoodNotes öffnen" button per `@pdf` section, and a collapsible hints/answers accordion per sub-task (1a, 1b, …).

---

## Section Modifiers

Modifier lines before a `#` heading set the type and behavior of the entire section. Multiple modifiers can be combined.

| Modifier | Effect |
|----------|--------|
| `@checkpoint` | Section enforces validation — only auto-validatable tasks allowed |
| `@challenge` | Section is marked as optional extension work — open-ended tasks, no auto-validation required |
| `@pdf` | All `## task:` blocks are collected into a single PDF worksheet |
| `@grid squares` | Default squared work area for all tasks in the section |
| `@grid lines` | Default lined work area |
| `@grid free` | Default blank work area |
| `@space s/m/l/page` | Default work-area size for all tasks in the section |

`@checkpoint` and `@pdf` cannot be combined — the parser throws an error.

---

### @checkpoint

Tasks in a `@checkpoint` section must be digitally validatable. Valid task types: `input`, `mcq`, `scq`, `spot-error`, `match`, `classify`, `gap`. Using `text`, `code`, or `task` is a parser error. Every task gives direct feedback on submission.

```markdown
@checkpoint
# Checkpoint

## input: Ergebnis

Berechne $f(3)$ für $f(x) = 2x^2 - 1$.

### answer
number: 17
```

---

### @challenge

Open-ended, creative, or demanding extension tasks. Not automatically validatable. Prefer `task` for handwritten work. Do not force Challenges into closed-answer formats.

```markdown
@challenge
# Challengesn

## task: Beweis skizzieren

Begründe geometrisch, warum $\sin^2(x) + \cos^2(x) = 1$ gilt.

### hint

Betrachte einen Punkt auf dem Einheitskreis.
```

---

### @pdf

Marks the section as a handwritten PDF task. All `## task:` blocks are collected into one PDF. Section-level `@grid` and `@space` set the default; individual tasks override them.

```markdown
@pdf
@grid squares
@space l
# Aufgaben

## task: Gleichungssystem lösen       ← squares, l (inherited)

$$\begin{cases} 2x + y = 7 \\ x - y = 1 \end{cases}$$

@space page
@grid free
## task: Parabel skizzieren           ← free, page (overridden)

Skizziere $f(x) = x^2 - 2x + 1$.

![](./assets/koordinatensystem.png)
```

`@challenge` and `@pdf` can be combined when Challenges are handwritten:

```markdown
@challenge
@pdf
@grid free
# Challenges
```

### PDF Work Area Modifiers

| Modifier | Scope | Effect |
|----------|-------|--------|
| `@space s` | Section or Task | Small work area (~¼ page) |
| `@space m` | Section or Task | Medium work area (~⅓ page) |
| `@space l` | Section or Task | Large work area (~½ page) — default |
| `@space page` | Section or Task | Task starts on new page and fills it |
| `@grid squares` | Section or Task | Squared / graph-paper area |
| `@grid lines` | Section or Task | Lined area (for written text) |
| `@grid free` | Section or Task | Blank white area (drawings, coordinate systems) |

---

## Modifiers

Modifier lines start with `@` and apply to the next task block or display element:

| Modifier | Effect |
|----------|--------|
| `@compact` | Render an `mcq` task in a narrower, multi-column layout (wide is the default) |
| `@no-shuffle` | Disable option/item shuffling for `mcq`, `match`, and `classify` tasks |
| `@mcq` | Force MCQ rendering for a `gap` task |
| `@list` | Render gap answers as a list |
| `@tolerance <value>` | Allow a numeric margin of error for `input` tasks (e.g. `@tolerance 0.01`) |

Example:

```markdown
@compact
@no-shuffle
## mcq: Reihenfolge beachten

These options will not be shuffled and render in a compact layout.

- (x) First correct answer
- ( ) Wrong
- ( ) Also wrong
```

---

## Images

Images are embedded with standard Markdown image syntax. Paths are relative to the content file:

```markdown
![Beschriftung](./assets/diagram.png)
```

---

## Tables

Tables use standard Markdown pipe syntax:

```markdown
| Funktion | Ableitung |
|----------|-----------|
| $x^n$   | $n \cdot x^{n-1}$ |
| $e^x$   | $e^x$ |
| $\ln x$ | $\frac{1}{x}$ |
```
