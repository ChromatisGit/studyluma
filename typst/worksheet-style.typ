#let colors = (
  page: rgb(249, 250, 251),
  card: rgb(255, 255, 255),
  text: rgb(17, 24, 39),
  muted: rgb(75, 85, 99),
  subtle: rgb(107, 114, 128),
  border: rgb(229, 231, 235),
  border-strong: rgb(209, 213, 219),
  code-bg: rgb(245, 245, 245),
  code-border: rgb(200, 200, 200),
  option-bg: rgb(248, 250, 252),
  badge-bg: rgb(226, 228, 236),
  category: (
    Checkpoint: rgb(50, 152, 154),
    Aufgaben: rgb(87, 132, 236),
    Challenges: rgb(235, 128, 35),
    Info: rgb(107, 47, 160),
  ),
)

#let radius = 4pt
#let padding = (xs: 4pt, sm: 7pt, md: 12pt, lg: 16pt)
#let gap = (sm: 6pt, md: 10pt, lg: 16pt, xl: 22pt)

#let font-body = ("Segoe UI", "Calibri")
#let font-code = ("Cascadia Code", "Cascadia Mono")


#let _started = state("started", false)
#let _category-color = state("cat-color", rgb(107, 114, 128))
#let _category-kind = state("cat-kind", "info")
#let _in-group = state("in-group", false)
#let _task-counter = counter("task-num")
#let _subtask-counter = counter("subtask-num")

#let worksheet-style(body) = {
  // GLOBAL DOC STYLING
  show: doc => {
    set page(
      margin: (top: 1.8cm, bottom: 1.8cm, left: 1.8cm, right: 1.8cm),
      fill: colors.page,
      background: context {
        let current-page = here().page()
        let all-h1 = query(heading.where(level: 1))
        let pg-height = page.height
        let m = (top: 1.8cm, bottom: 1.8cm, left: 1.8cm)
        let stripe-x = m.left - 16pt

        for (i, h) in all-h1.enumerate() {
          let h-pos = h.location().position()
          let h-page = h-pos.page
          let fill-color = colors.category.at(
            h.body.text,
            default: colors.category.Info,
          )

          let next-h = all-h1.at(i + 1, default: none)
          let end-page = if next-h != none { next-h.location().position().page } else { 9999 }
          let end-y = if next-h != none { next-h.location().position().y } else { pg-height - m.bottom }

          if current-page < h-page or current-page > end-page { continue }

          let stripe-top = if current-page == h-page {
            h-pos.y
          } else { m.top }

          let stripe-bottom = if current-page == end-page and next-h != none {
            end-y - 16pt
          } else { pg-height - m.bottom }

          let stripe-height = stripe-bottom - stripe-top
          if stripe-height > 0pt {
            place(top + left, dx: stripe-x, dy: stripe-top, rect(
              width: 3pt,
              height: stripe-height,
              fill: fill-color,
              radius: 1.5pt,
            ))
          }
        }
      },
    )

    set text(font: font-body, size: 11pt, fill: colors.text)
    set par(leading: 1em, justify: true)

    _task-counter.update(1)

    doc
  }

  show par: it => context {
    if _started.get() { it }
  }

  show heading.where(level: 1): title => {
    set text(size: 13pt, fill: colors.page)
    let fill-color = colors.category.at(
      title.body.text,
      default: colors.category.Info,
    )
    _started.update(true)
    _category-color.update(fill-color)
    // Determine category kind for numbering decisions
    let name = title.body.text
    let kind = if lower(name) == "checkpoint" { "checkpoint" } else if (
      lower(name) == "aufgaben" or lower(name) == "tasks"
    ) { "core" } else if lower(name) == "challenges" or lower(name) == "challenge" { "challenge" } else { "info" }
    _category-kind.update(kind)


    block(
      width: 100%,
      fill: fill-color,
      radius: radius,
      inset: (x: 10pt, y: 6pt),
      text(weight: "bold", title.body),
    )
  }

  show heading.where(level: 2): title => {
    v(gap.sm)
    text(size: 12pt, weight: "semibold", title.body)
  }

  show heading.where(level: 3): title => {
    text(size: 11pt, weight: "semibold", title.body)
  }

  show raw.where(block: true): it => {
    block(
      width: 100%,
      fill: colors.code-bg,
      stroke: 0.5pt + colors.code-border,
      inset: (x: 8pt, y: 6pt),
      radius: 3pt,
      breakable: true,
      {
        set text(size: 10pt, font: font-code)
        it // pass through directly — preserves syntax highlighting
      },
    )
  }

  body
}



#let note(body) = {
  block(
    width: 100%,
    radius: radius,
    stroke: 1pt + colors.border,
    fill: colors.card,
    inset: padding.lg,
    breakable: true,
    grid(
      columns: (24pt, 1fr),
      gutter: 8pt,
      circle(radius: 10pt, fill: colors.border)[
        #set align(center + horizon)
        #set text(weight: "bold", size: 10pt)
        i
      ],
      body,
    ),
  )
}

#let badge(content) = {
  circle(radius: 10pt, fill: colors.badge-bg)[
    #set align(center + horizon)
    #set text(weight: "bold", size: 10pt)
    #content
  ]
}

#let card(accent: none, body) = {
  block(
    width: 100%,
    radius: radius,
    stroke: 1pt + colors.border,
    fill: colors.card,
    inset: (top: padding.sm, left: padding.sm, rest: padding.md),

    context {
      let kind = _category-kind.get()
      let show-number = kind == "core" or kind == "challenge"
      if show-number {
        _task-counter.step()
        grid(
          columns: (18pt, 1fr),
          gutter: padding.md,
          badge(_task-counter.display("1")), pad(top: 6pt, body),
        )
      } else {
        body
      }
    },
  )
}

#let group(body) = {
  _in-group.update(true)
  _subtask-counter.update(1)
  card(body)
  _in-group.update(false)
}


#let task(body) = context {
  let in-grp = _in-group.get()

  if in-grp {
    // Inside group: show letter label (a, b, c)
    _subtask-counter.step()
    v(gap.sm)

    pad(left: -20pt,
      grid(
          columns: (12pt, 1fr),
          gutter: padding.md,
          text(weight: "bold", _subtask-counter.display("a)")), body,
        )
    )
  } else {
    // Standalone: own card with badge
    card(body)
  }
}


#let table(body) = {
  // Collect rows by splitting children on parbreak boundaries
  let rows = ()
  let current-row = ""
  for child in body.children {
    if child.func() == parbreak {
      if current-row.trim() != "" { rows.push(current-row.trim()) }
      current-row = ""
    } else if child.func() == raw {
      current-row += child.text
    } else if child.has("text") {
      current-row += child.text
    }
  }
  if current-row.trim() != "" { rows.push(current-row.trim()) }

  if rows.len() == 0 { return }

  let split-row(row) = row.split(",").map(c => c.trim())
  let cols = split-row(rows.at(0)).len()

  let cells = ()
  for (y, row) in rows.enumerate() {
    let parts = split-row(row)
    for (x, txt) in parts.enumerate() {
      if x >= cols { break }
      cells.push(if y == 0 { text(weight: "bold", txt) } else { txt })
    }
    let diff = cols - calc.min(parts.len(), cols)
    for _ in range(diff) { cells.push([]) }
  }

  block(
    width: 100%,
    breakable: true,
    grid(
      columns: (auto,) * cols,
      inset: 6pt,
      stroke: 0.6pt + colors.border,
      fill: (x, y) => if y == 0 { colors.badge-bg } else { none },
      ..cells,
    ),
  )
}



#let textTask(body) = {
  task({
    body
    v(8pt)
    for i in range(4) {
      v(18pt)
      line(length: 100%, stroke: 0.5pt + colors.border)
    }
  })
}

#let mathTask(body) = {
  task(body)
}

#let codeTask(body) = {
  task({
    body
    v(8pt)
    for i in range(3) {
      v(18pt)
      line(length: 100%, stroke: 0.5pt + colors.border)
    }
  })
}

#let parseGapWithUnderscores(match) = {
  let rawAnswers = match.captures.at(0).split("|")
  let answerLength = rawAnswers.at(0).trim().len()
  let placeholder = "_"
  let index = 0

  while index < answerLength {
    placeholder += "_"
    index += 1
  }

  return placeholder
}

#let parseGapAsAnswerList(match) = {
  let rawAnswers = match.captures.at(0).split("|").map(a => a.trim())
  return "(" + rawAnswers.join(", ") + ")"
}

#let gap(mode: "text", body) = {
  let gapPattern = regex("\(\(([^\(\)]+)\)\)")
  let gapReplacer = if (mode == "text") { parseGapWithUnderscores } else { parseGapAsAnswerList }

  // Process code blocks manually (show regex doesn't reach inside raw text)
  let processed = []
  for item in body.children {
    if item.has("lang") {
      let newText = item.text.replace(gapPattern, gapReplacer)
      processed += raw(newText, lang: item.lang, block: item.at("block", default: false))
    } else {
      processed += item
    }
  }

  task({
    // Show rule handles prose text gaps (reaches inside paragraphs)
    show regex("\(\([^\(\)]+\)\)"): it => {
      let s = it.text
      let inner = s.slice(2, s.len() - 2)
      let answers = inner.split("|").map(a => a.trim())
      if mode == "text" {
        "_" * (answers.at(0).len() + 1)
      } else {
        "(" + answers.join(", ") + ")"
      }
    }
    processed
  })
}

#let mcq(single: false, wideLayout: false, shuffleOptions: true, body) = {
  task({
    show list: it => {
      let items = it.children
      let num-cols = if wideLayout {
        calc.min(2, items.len())
      } else {
        calc.min(4, items.len())
      }

      grid(
        columns: (1fr,) * num-cols,
        column-gutter: 8pt,
        row-gutter: 8pt,
        ..items.map(item => {
          let indicator = if single {
            circle(radius: 5pt, stroke: 0.8pt + colors.text)
          } else {
            rect(width: 10pt, height: 10pt, stroke: 0.8pt + colors.text, radius: 2pt)
          }

          box(
            width: 100%,
            fill: colors.option-bg,
            inset: 8pt,
            radius: radius,
            stroke: 0.5pt + colors.border,
            grid(
              columns: (14pt, 1fr),
              gutter: 6pt,
              align(horizon, indicator),
              align(horizon, {
                // Strip [x]/[ ] checkbox markers via regex
                show regex("\[[ x]\]\s?"): none
                item.body
              }),
            ),
          )
        }),
      )
    }
    body
  })
}

#let starter(body) = [
  #body
]

#let hint(body) = []

#let solution(body) = []

#let validation(body) = []

#let pb = colbreak()