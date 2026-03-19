#import "/typst/macros.typ": _parse-table
#let _std-image = image
#let image(file: "") = _std-image(file, width: 100%, fit: "contain")

#let colors = (
  page: white,
  text: rgb(30, 30, 30),
  muted: rgb(90, 95, 100),
  accent: rgb(40, 60, 100),
  border: rgb(200, 205, 215),
  table-header: rgb(230, 235, 242),
  card: (
    highlight: (bg: rgb(255, 249, 225), border: rgb(220, 180, 60)),
    concept:   (bg: rgb(235, 244, 255), border: rgb(130, 180, 240)),
    definition:(bg: rgb(238, 255, 242), border: rgb(90, 190, 130)),
    default:   (bg: rgb(245, 246, 248), border: rgb(200, 205, 215)),
  ),
)

#let font-body = ("Segoe UI", "Calibri")

#let title(body) = {
  block(
    width: 100%,
    fill: colors.accent,
    inset: (x: 14pt, y: 10pt),
    radius: 4pt,
    text(size: 16pt, weight: "bold", fill: white, body),
  )
  v(10pt)
}

#let card(kind: "default", body) = {
  let c = colors.card.at(kind, default: colors.card.default)
  block(
    width: 100%,
    fill: c.bg,
    stroke: 1pt + c.border,
    inset: (x: 12pt, y: 8pt),
    radius: 4pt,
    breakable: true,
    body,
  )
}

#let note(body) = {
  block(
    width: 100%,
    stroke: 0.6pt + colors.border,
    inset: (x: 12pt, y: 8pt),
    radius: 4pt,
    breakable: true,
    grid(
      columns: (18pt, 1fr),
      gutter: 8pt,
      text(weight: "bold", fill: colors.muted, "i"),
      body,
    ),
  )
}

#let table(body, header: true) = {
  let rows = _parse-table(body)
  if rows.len() == 0 { return }

  let cols = rows.at(0).len()
  let cells = ()
  for (y, row) in rows.enumerate() {
    for (x, cell) in row.enumerate() {
      if x >= cols { break }
      cells.push(if header and y == 0 { strong(cell) } else { cell })
    }
    for _ in range(cols - calc.min(row.len(), cols)) { cells.push([]) }
  }

  block(
    width: 100%,
    breakable: true,
    grid(
      columns: (auto,) * cols,
      inset: 6pt,
      stroke: 0.6pt + colors.border,
      fill: (x, y) => if header and y == 0 { colors.table-header } else { none },
      ..cells,
    ),
  )
}

#let overview-style(body) = {
  show: doc => {
    set page(
      paper: "a4",
      margin: (top: 1.5cm, bottom: 1.5cm, left: 1.8cm, right: 1.8cm),
      fill: white,
    )
    set text(font: font-body, size: 11pt, fill: colors.text)
    set par(leading: 0.9em, justify: true)
    doc
  }

  show heading.where(level: 1): it => {
    block(above: 14pt, below: 6pt,
      text(size: 13pt, weight: "bold", fill: colors.accent, it.body)
    )
  }

  show heading.where(level: 2): it => {
    block(above: 10pt, below: 10pt,
      text(size: 11.5pt, weight: "semibold", it.body)
    )
  }

  show heading.where(level: 3): it => {
    block(above: 8pt, below: 2pt,
      text(size: 11pt, weight: "semibold", fill: colors.muted, it.body)
    )
  }

  show raw.where(block: true): it => {
    block(
      width: 100%,
      fill: rgb(245, 245, 245),
      stroke: 0.5pt + colors.border,
      inset: (x: 8pt, y: 6pt),
      radius: 3pt,
      breakable: true,
      text(size: 10pt, font: ("Cascadia Code", "Cascadia Mono"), it),
    )
  }

  body
}
