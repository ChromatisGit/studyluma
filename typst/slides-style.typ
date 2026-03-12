// slides-style.typ
// Typst style definitions for slide content files.
// These functions define how slides render to PDF/print.
// The web pipeline parses the same .typ files independently.

#import "/typst/macros.typ": _parse-table

#let colors = (
  page: rgb(248, 247, 255),
  surface: rgb(255, 255, 255),
  text: rgb(29, 24, 48),
  muted: rgb(112, 106, 138),
  border: rgb(219, 214, 240),
  accent: rgb(107, 47, 160),
  blue: rgb(87, 132, 236),
  orange: rgb(235, 128, 35),
  green: rgb(46, 133, 85),
)

#let radius = 8pt
#let padding = (xs: 4pt, sm: 8pt, md: 14pt, lg: 20pt)
#let gap = (sm: 8pt, md: 14pt, lg: 20pt, xl: 28pt)

#let font-body = ("DM Sans", "Segoe UI", "Inter")
#let font-mono = ("Cascadia Code", "Cascadia Mono", "Consolas")


// ─── Main Style ──────────────────────────────────────────────────────────────

#let slides-style(body) = {
  show: doc => {
    set page(
      width: 25.4cm,
      height: 19.05cm,  // 4:3 ratio
      margin: (x: 1.4cm, y: 1.2cm),
      fill: colors.page,
      background: {
        // Shadow: same size as card, shifted down — simulates box-shadow y-offset
        // --sn-shadow-lw: 0 4px 12px color-mix(in srgb, #1d1830 8%, transparent)
        place(center + horizon, dy: 4pt,
          block(
            width: 25.4cm - 1.2cm,
            height: 19.05cm - 1.2cm,
            fill: rgb("#1d183014"),
            radius: 16pt,
          )
        )
        // White card — --sn-border: #dbd6f0
        place(center + horizon,
          block(
            width: 25.4cm - 1.2cm,
            height: 19.05cm - 1.2cm,
            fill: white,
            radius: 16pt,
            stroke: 0.8pt + rgb("#dbd6f0"),
          )
        )
      },
    )
    set text(font: font-body, size: 12pt, fill: colors.text)
    set par(leading: 0.8em)
    doc
  }

  // Level-1 headings become slide titles — each starts a new page
  show heading.where(level: 1): it => {
    pagebreak(weak: true)
    block(
      width: 100%,
      stroke: (left: 5pt + colors.accent, rest: none),
      inset: (left: 12pt, top: 4pt, bottom: 4pt, right: 0pt),
      {
        set text(weight: "bold", size: 15pt, fill: colors.text)
        it.body
      },
    )
    v(gap.md)
  }

  // Level-2 headings become subheaders within a slide
  show heading.where(level: 2): it => {
    v(gap.sm)
    block(
      width: 100%,
      stroke: (bottom: 0.8pt + colors.border, rest: none),
      inset: (bottom: 5pt, top: 0pt, x: 0pt),
      {
        set text(size: 11pt, weight: "semibold", fill: colors.muted)
        it.body
      }
    )
    v(gap.sm)
  }

  show raw.where(block: true): it => {
    block(
      width: 100%,
      fill: rgb(15, 23, 42),
      radius: radius,
      inset: (x: 10pt, y: 8pt),
      {
        set text(font: font-mono, size: 10pt, fill: rgb(230, 237, 245))
        it
      },
    )
  }

  body
}


// ─── Title Slide ─────────────────────────────────────────────────────────────

#let title(body) = {
  align(center + horizon, {
    text(size: 10pt, fill: colors.muted, weight: "medium")[Foliensatz zu]
    v(gap.sm)
    text(size: 28pt, weight: "bold", fill: colors.text, body)
    v(gap.md)
    line(length: 3cm, stroke: 2pt + colors.accent)
  })
  place(bottom + center,
    text(size: 8pt, fill: colors.muted)[
      Statischer PDF-Export; im Unterricht wurde eine interaktive Version auf studynode.de verwendet.
    ]
  )
  pagebreak(weak: false)
}


// ─── Card ────────────────────────────────────────────────────────────────────

#let _card-accent(kind) = {
  if kind == "task" or kind == "prompt" { colors.blue }
  else if kind == "concept" or kind == "definition" or kind == "example" { colors.muted }
  else if kind == "highlight" or kind == "key" or kind == "recap" { colors.accent }
  else if kind == "remember" { rgb(211, 165, 47) }   // --sn-yellow-accent-strong
  else if kind == "warning" { colors.orange }
  else if kind == "answer" { colors.green }
  else { colors.border }  // plain: barely-visible border, no accent
}

#let _card-tint(kind) = {
  if kind == "task" or kind == "prompt" { rgb(236, 242, 255) }
  else if kind == "highlight" or kind == "key" or kind == "recap" { rgb(245, 235, 255) }
  else if kind == "remember" { rgb(255, 247, 214) }  // --sn-yellow-accent-soft-bg
  else if kind == "warning" { rgb(255, 244, 230) }
  else if kind == "answer" { rgb(235, 248, 240) }
  else { colors.surface }  // concept, plain: no tint
}

#let _card-label(kind) = {
  (
    definition: "Definition",
    concept: "Konzept",
    example: "Beispiel",
    check: "Analyse",
    prompt: "Frage",
    task: "Aufgabe",
    highlight: "Merke",
    key: "Schlüssel",
    recap: "Zusammenfassung",
    remember: "Hinweis",
    warning: "Achtung",
    answer: "Lösung",
  ).at(kind, default: "")  // plain and unknown kinds get no label
}

#let card(kind: "concept", body) = {
  let accent = _card-accent(kind)
  let label = _card-label(kind)
  let is-plain = kind == "plain"
  block(
    width: 100%,
    radius: radius,
    stroke: if is-plain { 0.8pt + colors.border } else { (left: 4pt + accent, rest: 0.8pt + colors.border) },
    fill: _card-tint(kind),
    inset: padding.md,
    {
      if label != "" {
        text(size: 9pt, weight: "bold", fill: accent, upper(label))
        v(gap.sm)
      }
      body
    },
  )
  v(gap.md)
}


// ─── KTable ──────────────────────────────────────────────────────────────────
// Key-value style grid table with fixed gutters.
// cols: number of columns (default auto = inferred from first row)
// header: when true, first row is rendered bold (default false)
// Cells separated by ; (semicolon), rows by paragraph breaks.
// Usage: #ktable(cols: 2)[$a_3 =$; $2$ \ $a_2 =$; $3$]

#let ktable(cols: auto, header: false, body) = {
  let rows = _parse-table(body)
  if rows.len() == 0 { return }
  let actual-cols = if cols == auto { rows.at(0).len() } else { cols }
  let cells = ()
  for (y, row) in rows.enumerate() {
    for cell-content in row {
      let styled = if header and y == 0 { text(weight: "bold", cell-content) } else { cell-content }
      cells.push(styled)
    }
  }
  grid(
    columns: (auto,) * actual-cols,
    column-gutter: 14pt,
    row-gutter: 6pt,
    ..cells
  )
  v(gap.md)
}


// ─── Formula ─────────────────────────────────────────────────────────────────

#let formula(body) = {
  align(center,
    block(
      stroke: (top: 2pt + colors.accent, bottom: 2pt + colors.accent, rest: 0.8pt + colors.border),
      radius: radius,
      fill: rgb(245, 235, 255),
      inset: (x: padding.lg, y: padding.md),
      {
        set text(size: 14pt)
        body
      }
    )
  )
  v(gap.md)
}


// ─── Callout ─────────────────────────────────────────────────────────────────

#let callout(body) = {
  block(
    width: 100%,
    radius: radius,
    fill: rgb(245, 235, 255),
    stroke: none,
    inset: (x: padding.lg, y: padding.md),
    align(center,
      text(size: 13pt, weight: "semibold", fill: colors.accent, body)
    )
  )
  v(gap.md)
}


// ─── Steps ───────────────────────────────────────────────────────────────────
// Items separated by paragraph breaks inside a single [ ] body.

#let steps(body) = {
  let items = ()
  let buf = ()
  for c in body.children {
    if c.func() == parbreak {
      if buf.len() > 0 { items.push(buf.join()); buf = () }
    } else { buf.push(c) }
  }
  if buf.len() > 0 { items.push(buf.join()) }
  for i in range(items.len()) {
    grid(
      columns: (22pt, 1fr),
      column-gutter: 10pt,
      align(top,
        block(
          width: 22pt, height: 22pt,
          fill: colors.accent, radius: 11pt,
          align(center + horizon,
            text(size: 9pt, weight: "bold", fill: white, str(i + 1))
          )
        )
      ),
      pad(top: 2pt, items.at(i))
    )
    if i < items.len() - 1 { v(gap.sm) }
  }
  v(gap.md)
}


// ─── Layouts ─────────────────────────────────────────────────────────────────
// Columns separated by --- (em dash — ) inside a single [ ] body.

#let _split-em-dash(body) = {
  let parts = ((),)
  for c in body.children {
    if c.has("text") and c.text.trim() == "—" {
      parts.push(())
    } else {
      let last = parts.pop()
      parts.push(last + (c,))
    }
  }
  parts.map(p => p.join())
}

#let slideSplit(body) = {
  let p = _split-em-dash(body)
  grid(
    columns: (1fr, 1fr),
    column-gutter: gap.lg,
    p.at(0, default: []),
    p.at(1, default: [])
  )
}

#let slideMain(body) = {
  let p = _split-em-dash(body)
  grid(
    columns: (2fr, 1fr),
    column-gutter: gap.lg,
    p.at(0, default: []),
    p.at(1, default: [])
  )
}


// layout — web-only layout directive, no-op in PDF
#let layout(name) = []

// Presenter notes — rendered on web only, invisible in PDF
#let pn(body) = []

// codeRunner — full IDE on web, code block in PDF
#let codeRunner(body) = body
