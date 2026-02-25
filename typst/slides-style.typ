// slides-style.typ
// Typst style definitions for slide content files.
// These functions define how slides render to PDF/print.
// The web pipeline parses the same .typ files independently.

#let colors = (
  page: rgb(242, 243, 247),
  surface: rgb(249, 250, 251),
  text: rgb(29, 31, 39),
  muted: rgb(75, 81, 98),
  border: rgb(213, 216, 227),
  accent: rgb(107, 47, 160),
  blue: rgb(87, 132, 236),
  orange: rgb(235, 128, 35),
)

#let radius = 6pt
#let padding = (xs: 4pt, sm: 8pt, md: 14pt, lg: 20pt)
#let gap = (sm: 8pt, md: 14pt, lg: 20pt, xl: 28pt)

#let font-body = ("Segoe UI", "Calibri", "Inter")
#let font-mono = ("Cascadia Code", "Cascadia Mono", "Consolas")


// ─── Main Style ──────────────────────────────────────────────────────────────

#let slides-style(body) = {
  show: doc => {
    set page(
      width: 25.4cm,
      height: 14.29cm,
      margin: (x: 1.8cm, y: 1.4cm),
      fill: colors.page,
    )
    set text(font: font-body, size: 13pt, fill: colors.text)
    set par(leading: 0.8em)
    doc
  }

  // Level-1 headings become slide titles (shown in header banner)
  show heading.where(level: 1): it => {
    block(
      width: 100%,
      fill: colors.accent,
      radius: 10pt,
      inset: (x: 14pt, y: 8pt),
      text(weight: "bold", fill: white, it.body),
    )
    v(gap.md)
  }

  // Level-2 headings become subheaders within a slide
  show heading.where(level: 2): it => {
    v(gap.sm)
    text(size: 15pt, weight: "semibold", it.body)
    v(gap.sm)
  }

  show raw.where(block: true): it => {
    block(
      width: 100%,
      fill: rgb(15, 23, 42),
      radius: radius,
      inset: (x: 10pt, y: 8pt),
      {
        set text(font: font-mono, size: 11pt, fill: rgb(230, 237, 245))
        it
      },
    )
  }

  body
}


// ─── Card ────────────────────────────────────────────────────────────────────

#let _card-accent-color(kind) = {
  if kind == "task" or kind == "prompt" { colors.blue }
  else if kind == "highlight" or kind == "key" or kind == "recap" or kind == "remember" { colors.accent }
  else if kind == "warning" { colors.orange }
  else { colors.border }
}

#let _card-label(kind) = {
  let labels = (
    definition: "Definition",
    concept: "Konzept",
    example: "Beispiel",
    check: "Analyse",
    prompt: "Frage",
    task: "Aufgabe",
    highlight: "Merke",
    key: "Schlüssel",
    recap: "Zusammenfassung",
    remember: "Wichtig",
    warning: "Achtung",
  )
  labels.at(kind, default: kind)
}

#let card(kind: "concept", body) = {
  let accent = _card-accent-color(kind)
  block(
    width: 100%,
    radius: radius,
    stroke: (left: 3pt + accent, rest: 0.8pt + colors.border),
    fill: colors.surface,
    inset: (left: padding.md, rest: padding.md),
    {
      text(
        size: 9pt,
        weight: "semibold",
        fill: colors.muted,
        upper(_card-label(kind)),
      )
      v(gap.sm)
      body
    },
  )
  v(gap.md)
}


// ─── Pairs ───────────────────────────────────────────────────────────────────

#let pairs(body) = {
  // Collect lines and split into key-value pairs
  let rows = ()
  let current = ""
  for child in body.children {
    if child.func() == parbreak {
      if current.trim() != "" { rows.push(current.trim()) }
      current = ""
    } else if child.has("text") {
      current += child.text
    } else if child.func() == raw {
      current += "`" + child.text + "`"
    }
  }
  if current.trim() != "" { rows.push(current.trim()) }

  let cells = ()
  for row in rows {
    let parts = row.split(",")
    if parts.len() >= 2 {
      cells.push(text(font: font-mono, size: 10pt, fill: colors.muted, parts.at(0).trim()))
      cells.push(parts.slice(1).join(",").trim())
    }
  }

  if cells.len() > 0 {
    grid(
      columns: (auto, 1fr),
      column-gutter: 14pt,
      row-gutter: 6pt,
      ..cells,
    )
  }
  v(gap.md)
}


// layout — web-only layout directive, no-op in PDF
#let layout(name) = []

// Presenter notes — rendered on web only, invisible in PDF
#let pn(body) = []

// codeRunner — full IDE on web, code block in PDF
#let codeRunner(body) = body
