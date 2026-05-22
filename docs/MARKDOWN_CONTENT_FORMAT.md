# Markdown Content Format

This document describes the Markdown syntax supported by the StudyNode content pipeline (`studynode-content`). All worksheet and slide deck files are written in this format.

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
# Einführung

Text and tasks for this section...

# Aufgaben

More tasks here...
```

### Special Section Names

Two section names have special visual treatment:

```markdown
# Checkpoint

Tasks in this section are displayed with a checkpoint style.

# Challenges

Optional extension tasks, displayed differently from standard sections.
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

Inline math uses single dollar signs; block math uses double:

```markdown
The derivative $f'(x)$ of a polynomial...

$$
f'(x) = \lim_{h \to 0} \frac{f(x+h) - f(x)}{h}
$$
```

Math is rendered with KaTeX.

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
| `## text: Title` | Free-text response task |
| `## text-task: Title` | Free-text response task (alias) |
| `## code: Title` | Code editor task |
| `## code-task: Title` | Code editor task (alias) |
| `## mcq: Title` | Multiple-choice (multiple answers allowed) |
| `## multiple-choice: Title` | Multiple-choice (alias) |
| `## single-choice: Title` | Single-choice (exactly one correct answer) |
| `## gap: Title` | Gap-fill / cloze task |
| `## gap-task: Title` | Gap-fill (alias) |

Tasks within a section are automatically grouped together.

### Task Subsections

Inside a task block, H3 headings (`###`) define optional subsections:

| Subsection | Purpose |
|------------|---------|
| `### hint` | Collapsible hint shown to the student on request |
| `### solution` | Model solution shown after submission |
| `### starter` | Initial code for code tasks (pre-filled in the editor) |
| `### validation` | Validation code for code tasks (must return `true` to pass) |

### Text Task Example

```markdown
## text: Erläuterung

Erkläre in eigenen Worten, was eine Sekante ist.

### hint

Eine Sekante verbindet zwei Punkte auf einem Funktionsgraphen.

### solution

Eine Sekante ist eine Gerade, die einen Graphen in zwei Punkten schneidet.
Sie beschreibt die durchschnittliche Änderungsrate zwischen diesen Punkten.
```

### Code Task Example

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

### solution

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

### Multiple Choice Example

```markdown
## mcq: Ableitung

Welche der folgenden Aussagen sind korrekt?

- [x] Die Ableitung von $x^2$ ist $2x$.
- [ ] Die Ableitung von $x^2$ ist $x^2$.
- [x] Die Ableitung einer Konstante ist $0$.
- [ ] Die Ableitung von $sin(x)$ ist $-cos(x)$.
```

Correct answers are marked with `[x]`, incorrect with `[ ]`.

### Single Choice Example

```markdown
## single-choice: Tangentensteigung

An welcher Stelle hat $f(x) = x^2$ die Steigung $4$?

- ( ) $x = 1$
- (x) $x = 2$
- ( ) $x = 4$
```

### Gap Fill Example

```markdown
## gap: Lückentext

Ein Grenzwert existiert, wenn der linksseitige und der rechtsseitige
((Grenzwert | Limes | Funktionswert)) ((übereinstimmen | gleich sind)).
```

Gaps are marked with `((...))`. Inside the gap, alternatives are separated by `|`. The **first** alternative is the correct answer; the others are distractors.

---

## Task Separators

A horizontal rule (`---`) ends the current task group and starts a new independent group:

```markdown
## text: Erste Aufgabe

Beantworte die erste Frage.

---

## text: Zweite Aufgabe

Diese Aufgabe ist unabhängig von der ersten.
```

---

## Modifiers

Modifier lines start with `@` and apply to the next task block or display element:

| Modifier | Effect |
|----------|--------|
| `@wide` | Render the element in a wider layout |
| `@no-shuffle` | Disable option shuffling for MCQ tasks |
| `@mcq` | Force MCQ rendering for a gap task |
| `@list` | Render gap answers as a list |

Example:

```markdown
@wide
@no-shuffle
## mcq: Reihenfolge beachten

These options will not be shuffled and render in wide layout.

- [x] First correct answer
- [ ] Wrong
- [ ] Also wrong
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
