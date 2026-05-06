// slides-style-new.typ
// Didactic slide system for StudyNode PDF output.
// 9 slide types derived from teaching situations, not subject matter.

// ─── Design System ────────────────────────────────────────────────────────────

#let colors = (
  page:    rgb(248, 247, 255),   // --sn-bg: lavender tint
  surface: rgb(255, 255, 255),   // white card
  text:    rgb(29,  24,  48),    // --sn-text
  muted:   rgb(112, 106, 138),   // subdued text
  border:  rgb(219, 214, 240),   // --sn-border
  purple:  rgb(124,  53, 184),   // --sn-purple-accent
  blue:    rgb(87,  132, 236),   // --sn-blue-accent
  orange:  rgb(235, 128,  35),   // --sn-orange-accent
  green:   rgb(46,  133,  85),   // --sn-green-accent
  teal:    rgb(50,  152, 154),   // --sn-teal-accent
)

#let tints = (
  purple: rgb(245, 235, 255),
  blue:   rgb(236, 242, 255),
  orange: rgb(255, 244, 230),
  green:  rgb(235, 248, 240),
  teal:   rgb(230, 248, 248),
  muted:  rgb(248, 247, 255),
)

#let radius  = 8pt
#let padding = (xs: 4pt, sm: 8pt, md: 14pt, lg: 20pt)
#let gap     = (xs: 6pt, sm: 10pt, md: 16pt, lg: 24pt, xl: 32pt)

// Slide format: "16:9" (default, 33.87 × 19.05 cm) or "4:3" (25.4 × 19.05 cm)
#let slide-format = "4:3"

#let _page-w = if slide-format == "4:3" { 25.4cm  } else { 33.87cm }
#let _page-h = if slide-format == "4:3" { 19.05cm } else { 19.05cm }
#let _card-w = _page-w - 0.8cm
#let _card-h = _page-h - 0.6cm

// Minimum widths for cards and bullet point containers (in cm)
#let card-min-width   = 12cm  // focus-box and result-box
#let points-width = 9cm   // bullet point block width

#let font-body = ("DM Sans", "Segoe UI", "Inter")
#let font-mono = ("Cascadia Code", "Cascadia Mono", "Consolas")

// Typography scale — all sizes proportional to font-size-base
#let font-size-base = 13pt
#let fs-tiny    = font-size-base * 0.577  // ≈  7.5pt — minor hint text
#let fs-badge   = font-size-base * 0.615  // ≈  8pt   — badge labels
#let fs-caption = font-size-base * 0.692  // ≈  9pt   — captions, image labels
#let fs-small   = font-size-base * 0.769  // ≈ 10pt   — link text, quiz elements
#let fs-sub     = font-size-base * 0.846  // ≈ 11pt   — section subtitle
#let fs-minor   = font-size-base * 0.923  // ≈ 12pt   — card body text
#let fs-body    = font-size-base          // = 13pt   — default body text
#let fs-focus   = font-size-base * 1.077  // ≈ 14pt   — focus box content
#let fs-heading = font-size-base * 1.154  // ≈ 15pt   — headers, card titles, formula
#let fs-task    = font-size-base * 1.615  // ≈ 21pt   — task slide focus
#let fs-title   = font-size-base * 2.0    // ≈ 26pt   — title slide
#let fs-section = font-size-base * 2.615  // ≈ 34pt   — section slide

// Save built-ins before shadowing
#let _std-image  = image
#let _std-link   = link
#let _std-list   = list
#let _std-layout = layout


// ─── Slide State ──────────────────────────────────────────────────────────────

#let _slide-title    = state("sn-slide-title", [])
#let _slide-type     = state("sn-slide-type", "")
#let _slide-accent   = state("sn-slide-accent", colors.purple)
#let _result-accent  = state("sn-result-accent", colors.green)
#let _result-content = state("sn-result-content", none)
#let _focus-content  = state("sn-focus-content", none)
#let _columns-state  = state("sn-columns", ())
#let _in-material      = state("sn-in-material", false)
#let _quiz-item-correct = state("sn-quiz-item-correct", false)
#let _quiz-is-first     = state("sn-quiz-is-first", true)
#let _quiz-question     = state("sn-quiz-question", none)


// ─── Main Style ───────────────────────────────────────────────────────────────

#let slides-style(body) = {
  show: doc => {
    set page(
      width:  _page-w,
      height: _page-h,
      margin: (x: 1.5cm, y: 1.0cm),
      fill: colors.page,
      background: {
        // subtle drop shadow
        place(center + horizon, dy: 3pt,
          block(
            width:  _card-w,
            height: _card-h,
            fill:   rgb("#1d183012"),
            radius: 16pt,
          )
        )
        // white card
        place(center + horizon,
          block(
            width:  _card-w,
            height: _card-h,
            fill:   white,
            radius: 16pt,
            stroke: 0.7pt + colors.border,
          )
        )
      },
    )
    // = Headings become slide titles — no visual output, slide functions render them
    show heading.where(level: 1): it => {
      _slide-title.update(it.body)
    }
    set text(font: font-body, size: font-size-base, fill: colors.text)
    set par(leading: 0.8em)
    doc
  }
  body
}


// ─── Presenter Notes — invisible in PDF ───────────────────────────────────────

#let pn(body) = []

// ─── codeRunner — full IDE on web, styled card in PDF ────────────────────────
// Colors match --sn-code-bg, --sn-code-bg-border, --sn-code-text from tokens.css

#let _code-bg     = rgb(15,  23,  42)   // --sn-code-bg:        #0f172a
#let _code-header = rgb(35,  44,  65)   // --sn-code-bg-border: #232c41
#let _code-text   = rgb(230, 237, 245)  // --sn-code-text:      #e6edf5

#let _code-min-w = 10cm

#let codeRunner(body) = {
  layout(size => context {
    let inner = {
      set text(font: font-mono, size: fs-minor, fill: _code-text)
      body
    }
    let proto = block(
      inset: (x: padding.md, y: padding.sm),
      inner,
    )
    let w = calc.max(calc.min(measure(proto).width, size.width), _code-min-w)
    block(
      width: w,
      radius: radius,
      clip: true,
      stroke: none,
      stack(
        dir: ttb,
        // header bar — "Code-Editor" label only, no button
        block(
          width: w,
          fill: _code-header,
          inset: (x: padding.md, y: padding.sm),
          text(size: fs-small, weight: "bold", fill: _code-text, "Code-Editor")
        ),
        // code body
        block(
          width: w,
          fill: _code-bg,
          inset: (x: padding.md, y: padding.sm),
          inner,
        ),
      )
    )
  })
  v(gap.sm)
}


// ─── Internal Helpers ─────────────────────────────────────────────────────────

// Small colored pill label
#let _badge(label, color) = box(
  inset: (x: 5pt, y: 2pt),
  radius: 3pt,
  fill: color.transparentize(82%),
  text(size: fs-badge, weight: "bold", fill: color, upper(label))
)

// Badge + title in one line, followed by a divider
#let _header(badge-label, badge-color, slide-title) = {
  grid(
    columns: (auto, 1fr),
    column-gutter: 7pt,
    align(center + horizon, _badge(badge-label, badge-color)),
    align(left + horizon,
      text(size: fs-heading, weight: "bold", fill: colors.text, slide-title)
    ),
  )
  v(gap.xs)
  line(length: 100%, stroke: 0.5pt + colors.border)
  v(gap.md)
}

// Colored statement / question box
// Auto-width: grows to fit content, but never narrower than card-min-width-ratio of available width.
// Text inside is always left-aligned.
#let _focus-box(content, accent) = {
  layout(size => context {
    let min-w  = card-min-width
    let inner  = { set text(size: fs-focus); set align(left); content }
    let proto  = block(
      radius: radius,
      inset: (left: padding.lg, right: padding.lg, top: padding.md, bottom: padding.md),
      inner,
    )
    let w = calc.max(calc.min(measure(proto).width, size.width), min-w)
    block(
      width: w,
      radius: radius,
      fill: accent.transparentize(91%),
      stroke: (left: 3.5pt + accent, rest: 0.5pt + accent.transparentize(65%)),
      inset: (left: padding.lg, right: padding.lg, top: padding.md, bottom: padding.md),
      inner,
    )
  })
  v(gap.md)
}

// Result card — no label/title, content only. Text always left-aligned.
// centered: true → the box itself is centered on the slide (text stays left inside)
#let _result-box(content, accent, centered: false) = {
  layout(size => context {
    let min-w = card-min-width
    let inner = { set align(left); set text(size: fs-body); content }
    let proto = block(
      radius: radius,
      inset: (left: padding.lg, right: padding.lg, top: padding.md, bottom: padding.md),
      inner,
    )
    let w = calc.max(calc.min(measure(proto).width, size.width), min-w)
    let the-block = block(
      width: w,
      radius: radius,
      fill: accent.transparentize(90%),
      stroke: (left: 3.5pt + accent, rest: 0.5pt + accent.transparentize(65%)),
      inset: (left: padding.lg, right: padding.lg, top: padding.md, bottom: padding.md),
      inner,
    )
    if centered { align(center, the-block) } else { the-block }
  })
  v(gap.sm)
}

// Render body-block content with colored bullet markers for list items.
// Each list item is placed in its own centered points-width block with left-aligned content.
// Focus boxes and images are unaffected — they handle their own sizing via layout().
#let _styled-body(body, color, font-size: none) = {
  set _std-list(spacing: gap.sm)
  if font-size != none { set text(size: font-size) }
  show _std-list.item: it => align(center,
    block(width: points-width, {
      set align(left)
      grid(
        columns: (14pt, 1fr),
        column-gutter: 8pt,
        align(top, pad(top: 4pt,
          block(width: 7pt, height: 7pt, radius: 3.5pt, fill: color)
        )),
        pad(top: 1pt, it.body),
      )
    })
  )
  body
  v(gap.md)
}

// Layout helper: left text-content and right material according to layout
// "split": 2-col grid when material present, single column otherwise
// "center": everything stacked and center-aligned
#let _with-material(text-content, mat, layout) = {
  if layout == "center" {
    align(center, {
      text-content
      if mat != none { mat }
    })
  } else {
    // split
    if mat != none {
      grid(
        columns: (1fr, 1fr),
        column-gutter: gap.lg,
        text-content,
        {
          _in-material.update(true)
          mat
          _in-material.update(false)
        },
      )
    } else {
      text-content
    }
  }
}

// Render result stored via #result[...] — always centered, below main content
#let _render-result() = context {
  let r = _result-content.get()
  if r != none {
    _result-box(r, _result-accent.get(), centered: true)
  }
}


// ─── Inline Macros ────────────────────────────────────────────────────────────

// #focus[...] — always captures content to state.
// Each slide renders it full-width above the body/split via _render-focus().
#let focus(body) = {
  _focus-content.update(body)
}

// Render focus full-width centered above the main content area.
#let _render-focus() = context {
  let f = _focus-content.get()
  if f != none {
    align(center, _focus-box(f, _slide-accent.get()))
  }
}

// #result[...] — stores content; slide function renders it below the main area
#let result(body) = { _result-content.update(body) }

// #col[title][body] — appends a column to compareSlide
#let col(title, body) = {
  _columns-state.update(cols => cols + ((title: title, body: body),))
}


// ─── Title Slide ──────────────────────────────────────────────────────────────

#let title(body) = {
  align(center + horizon, {
    text(size: fs-caption, fill: colors.muted, weight: "medium")[Foliensatz zu]
    v(gap.sm)
    text(size: fs-title, weight: "bold", fill: colors.text, body)
    v(gap.md)
    line(length: 3cm, stroke: 2pt + colors.purple)
  })
  place(bottom + center,
    text(size: 7.5pt, fill: colors.muted)[
      Statischer PDF-Export — im Unterricht wurde eine interaktive Version auf studynode.de verwendet.
    ]
  )
  pagebreak(weak: false)
}


// ─── Material Helpers ─────────────────────────────────────────────────────────

#let formula(..args) = {
  let body = args.pos().at(0, default: none)
  let expr = body
  align(center,
    block(
      stroke: (top: 2pt + colors.purple, bottom: 2pt + colors.purple, rest: 0.5pt + colors.border),
      radius: radius,
      fill: tints.purple,
      inset: (x: padding.lg, y: padding.md),
      { set text(size: fs-heading); expr }
    )
  )
  v(gap.md)
}

#let link(url: "", label: none) = {
  let display = if label != none { label } else { text(url) }
  block(
    width: card-min-width,
    inset: (x: padding.md, y: padding.sm),
    radius: radius,
    stroke: 0.8pt + colors.blue,
    fill: tints.blue,
    grid(
      columns: (auto, 1fr, auto),
      column-gutter: 6pt,
      align(center + horizon, text(size: fs-small, fill: colors.blue)[→]),
      align(left + horizon, text(size: fs-small, fill: colors.blue, weight: "semibold", display)),
      align(right + horizon, text(size: fs-tiny, fill: colors.muted)[(öffnet im Browser)]),
    )
  )
  v(gap.md)
}

#let image(file: "", label: none, height: none) = context {
  // height: none → auto-detect: use auto inside material column, 1fr elsewhere
  let h = if height != none { height } else if _in-material.get() { auto } else { 1fr }
  align(center,
    _std-image(
      file,
      width:  100%,
      height: h,
      fit:    "contain",
    )
  )
  if label != none {
    align(center, text(size: fs-caption, fill: colors.muted, label))
  }
}

#let list(body) = {
  set _std-list(marker: text(fill: colors.purple)[•])
  body
  v(gap.md)
}


// ─── 1. sectionSlide ──────────────────────────────────────────────────────────
// Full purple background — no white card. Purely orientational.
// Usage:
//   = Section Title
//   #sectionSlide                     ← no subtitle
//   #sectionSlide[Optional subtitle]

#let sectionSlide(..args) = {
  let subtitle = args.pos().at(0, default: none)
  pagebreak(weak: true)
  // Purple overlay covering the white card
  place(top + left, dx: -1.5cm, dy: -1.0cm,
    block(
      width:  33.87cm - 0.8cm,
      height: 19.05cm - 0.6cm,
      fill:   colors.purple,
      radius: 16pt,
    )
  )
  context {
    let title = _slide-title.get()
    place(center + horizon,
      block(width: 26cm,
        align(center, {
          if subtitle != none {
            text(size: fs-sub, weight: "medium", fill: white.transparentize(35%), subtitle)
            v(gap.sm)
          }
          text(size: fs-section, weight: "bold", fill: white, title)
          v(gap.md)
          line(length: 4cm, stroke: 1.5pt + white.transparentize(55%))
        })
      )
    )
  }
  v(16.5cm) // page filler so next slide starts on a new page
}


// ─── 2. hookSlide ─────────────────────────────────────────────────────────────
// Opens a problem or guiding question. Creates curiosity.
// #focus[...] = Leitfrage (orange). Second block = material (→ split layout).
// Usage:
//   = Slide Title
//   #hookSlide[
//     #focus[Leitfrage]
//     - bullet
//   ][
//     #image(...)   ← optional → split layout
//   ]

#let hookSlide(..args) = {
  let body = args.pos().at(0, default: none)
  let mat  = args.pos().at(1, default: none)
  pagebreak(weak: true)
  _slide-accent.update(colors.orange)
  _result-accent.update(colors.green)
  _result-content.update(none)
  _focus-content.update(none)
  context { _header("Einstieg", colors.orange, _slide-title.get()) }
  if body != none { place(hide(body)) }
  _render-focus()
  _with-material(
    { if body != none { _styled-body(body, colors.orange) } },
    mat,
    if mat != none { "split" } else { "center" },
  )
  _render-result()
}


// ─── 3. conceptSlide ──────────────────────────────────────────────────────────
// Introduces a concept, rule, or definition.
// #focus[...] = core definition (purple). Second block = optional material.

#let conceptSlide(..args) = {
  let body = args.pos().at(0, default: none)
  let mat  = args.pos().at(1, default: none)
  pagebreak(weak: true)
  _slide-accent.update(colors.purple)
  _result-accent.update(colors.green)
  _result-content.update(none)
  _focus-content.update(none)
  context { _header("Konzept", colors.purple, _slide-title.get()) }
  if body != none { place(hide(body)) }
  _render-focus()
  _with-material(
    { if body != none { _styled-body(body, colors.purple) } },
    mat,
    if mat != none { "split" } else { "center" },
  )
  _render-result()
}


// ─── 4. compareSlide ──────────────────────────────────────────────────────────
// Contrasts two or more things.
// #focus[...] = comparison question (blue box, centered above columns).
// #col[title][body] = one comparison column (append as many as needed).
// #result[...] = synthesis conclusion (purple, always centered below columns).
// Usage:
//   = Slide Title
//   #compareSlide[
//     #focus[Frage?]
//     #col[A][content A]
//     #col[B][content B]
//     #result[Erkenntnis]
//   ]

#let compareSlide(..args) = {
  let body = args.pos().at(0, default: none)
  pagebreak(weak: true)
  _slide-accent.update(colors.blue)
  _result-accent.update(colors.purple)
  _result-content.update(none)
  _columns-state.update(())
  _focus-content.update(none)
  context { _header("Vergleich", colors.blue, _slide-title.get()) }

  // Capture pass: trigger #focus/#col/#result state updates invisibly
  if body != none { place(hide(body)) }
  _render-focus()
  // Reset columns so the visual pass doesn't double-append
  _columns-state.update(())
  // Visual pass: body without focus box (focus already rendered above)
  if body != none { align(center, _styled-body(body, colors.blue)) }

  context {
    let columns = _columns-state.get()
    let count = columns.len()
    if count > 0 {
      _std-layout(size => context {
        let min-card-w = 0.30 * _page-w
        let gutter     = gap.lg
        let use-fixed  = count <= 2

        let card-w = if use-fixed {
          min-card-w
        } else {
          (size.width - (count - 1) * gutter) / count
        }

        let card-inner(col) = {
          align(center, text(size: fs-heading, weight: "bold", fill: colors.text, col.title))
          line(length: 100%, stroke: 0.6pt + colors.blue.transparentize(60%))
          v(6pt)
          {
            set align(left)
            set text(size: fs-minor)
            show _std-list.item: it => grid(
              columns: (12pt, 1fr),
              column-gutter: 6pt,
              align(top, pad(top: 3pt,
                block(width: 6pt, height: 6pt, radius: 3pt, fill: colors.blue)
              )),
              pad(top: 1pt, it.body),
            )
            col.body
          }
        }

        let max-h = columns.fold(0pt, (acc, col) => calc.max(acc,
          measure(block(
            width: card-w,
            inset: (x: padding.lg, y: padding.md),
            card-inner(col),
          )).height
        ))

        let col-widths = if use-fixed { (min-card-w,) * count } else { (1fr,) * count }

        let cards = columns.map(col =>
          block(
            width:  100%,
            height: max-h,
            radius: radius,
            fill:   colors.blue.transparentize(91%),
            stroke: 0.6pt + colors.border,
            inset:  (x: padding.lg, y: padding.md),
            card-inner(col),
          )
        )

        let g = grid(
          columns:       col-widths,
          column-gutter: gutter,
          ..cards,
        )

        if use-fixed { align(center, g) } else { g }
      })
      v(gap.md)
    }
  }

  _render-result()
}


// ─── 5. exampleSlide ──────────────────────────────────────────────────────────
// Shows a worked example. #result[...] = final answer (green, below content).

#let exampleSlide(..args) = {
  let body = args.pos().at(0, default: none)
  let mat  = args.pos().at(1, default: none)
  pagebreak(weak: true)
  _slide-accent.update(colors.muted)
  _result-accent.update(colors.green)
  _result-content.update(none)
  _focus-content.update(none)
  context { _header("Beispiel", colors.muted, _slide-title.get()) }
  if body != none { place(hide(body)) }
  _render-focus()
  _with-material(
    { if body != none { _styled-body(body, colors.muted) } },
    mat,
    if mat != none { "split" } else { "center" },
  )
  _render-result()
}


// ─── 6. promptSlide ───────────────────────────────────────────────────────────
// Question for classroom dialogue.
// #focus[...] = question (blue). #result[...] = answer (green, always below grid).

#let promptSlide(..args) = {
  let body = args.pos().at(0, default: none)
  let mat  = args.pos().at(1, default: none)
  pagebreak(weak: true)
  _slide-accent.update(colors.blue)
  _result-accent.update(colors.green)
  _result-content.update(none)
  _focus-content.update(none)
  context { _header("Frage", colors.blue, _slide-title.get()) }
  if body != none { place(hide(body)) }
  _render-focus()
  _with-material(
    { if body != none { _styled-body(body, colors.blue) } },
    mat,
    if mat != none { "split" } else { "center" },
  )
  _render-result()
}


// ─── 7. taskSlide ─────────────────────────────────────────────────────────────
// Work assignment. Two positional blocks:
//   [body] — #focus, #result, #pn as inline macros + bullet list mixed together
//   [mat]  — material (right column) — optional
//
// #focus[...] is captured via state and rendered full-width above the grid.
// #result[...] is captured via state and rendered full-width below the grid.
// Bullet list items in body render in the left column (or centered if no mat).
//
// Usage — simple:
//   = Slide Title
//   #taskSlide[
//     #focus[Öffne StudyNode]
//   ]
//
// Usage — with steps and material:
//   = Slide Title
//   #taskSlide[
//     #focus[Öffne StudyNode]
//     #result[Hinweis]
//     #pn[...]
//     - Schritt 1
//     - Schritt 2
//   ][
//     #image(file: "/assets/website.png", height: auto)
//   ]

#let taskSlide(..args) = {
  let body = args.pos().at(0, default: none)
  let mat  = args.pos().at(1, default: none)
  pagebreak(weak: true)
  _slide-type.update("task")
  _slide-accent.update(colors.teal)
  _result-accent.update(colors.teal)
  _result-content.update(none)
  _focus-content.update(none)
  context { _header("Auftrag", colors.teal, _slide-title.get()) }
  // Capture pass: render body invisibly so #focus/#result update state
  if body != none { place(hide(body)) }
  // Render focus full-width from captured state
  context {
    let f = _focus-content.get()
    if f != none {
      block(
        width: 100%,
        radius: radius,
        fill: colors.teal,
        inset: (x: padding.lg, y: gap.xl),
        align(center,
          text(size: fs-task, weight: "bold", fill: white, f)
        )
      )
      v(gap.md)
    }
  }
  // Visual pass: body (bullets + inline macros) in left column, material in right
  _with-material(
    { if body != none { _styled-body(body, colors.teal) } },
    mat,
    if mat != none { "split" } else { "center" },
  )
  _render-result()
  _slide-type.update("")
}


// ─── 8. recapSlide ────────────────────────────────────────────────────────────
// Secures key insights. Content centered in a prominent card, vertically centered.

#let recapSlide(..args) = {
  let body = args.pos().at(0, default: none)
  pagebreak(weak: true)
  _slide-accent.update(colors.orange)
  _result-accent.update(colors.orange)
  _result-content.update(none)
  context { _header("Zusammenfassung", colors.orange, _slide-title.get()) }

  if body != none {
    v(1fr)
    align(center,
      block(
        width: 18cm,
        radius: radius,
        fill: colors.orange.transparentize(92%),
        stroke: (left: 4pt + colors.orange, rest: 0.8pt + colors.orange.transparentize(60%)),
        inset: (left: padding.lg, right: padding.lg, top: gap.md, bottom: gap.lg),
        {
          align(center,
            text(size: fs-minor, weight: "semibold", fill: colors.orange, tracking: 0.5pt,
              upper[Das Wichtigste]
            )
          )
          v(gap.sm)
          line(length: 100%, stroke: 0.6pt + colors.orange.transparentize(60%))
          v(gap.md)
          set text(size: fs-body)
          set align(left)
          show _std-list.item: it => pad(bottom: gap.md,
            grid(
              columns: (18pt, 1fr),
              column-gutter: 6pt,
              align(top, text(fill: colors.orange, weight: "bold", size: fs-body * 1.3, "▸")),
              align(top + left, pad(top: 1pt, it.body)),
            )
          )
          set _std-list(spacing: 0pt)
          body
        }
      )
    )
    v(1fr)
  }
}


// ─── 9. quizSlide ─────────────────────────────────────────────────────────────
// Multiple-choice question. Options are list items with [x] / [ ] markers.
// Correct items are detected via capture pass and rendered in green.
//
// Usage:
//   = Slide Title
//   #quizSlide[
//     #focus[Welche Funktion ist eine Polynomfunktion?]
//     #pn[Hinweise für die Lehrkraft]
//     - [x] $f(x) = 3x^2 + 2x + 1$
//     - [ ] $f(x) = sqrt(x) + 2$
//     - [ ] $f(x) = 2^x$
//     - [ ] $f(x) = 1/x$
//   ]

#let quizSlide(..args) = {
  let body = args.pos().at(0, default: none)
  if body == none { return }

  let letters = ("A", "B", "C", "D", "E", "F")

  _quiz-is-first.update(true)
  _quiz-question.update(none)

  // First slide: page break + header (subsequent ones emitted from the list show rule)
  pagebreak()
  _slide-accent.update(colors.teal)
  _result-accent.update(colors.green)
  _result-content.update(none)
  context { _header("Quiz", colors.teal, _slide-title.get()) }

  // Paragraphs = question text; suppress direct output and store for the next list
  show par: it => {
    _quiz-question.update(it.body)
    []
  }
  show parbreak: _ => []

  // Each list = one question's answer options
  show _std-list: it => {
    let items = it.children

    // All questions after the first get their own page + fresh header
    context {
      if not _quiz-is-first.get() {
        pagebreak()
        _slide-accent.update(colors.teal)
        _header("Quiz", colors.teal, _slide-title.get())
      }
    }
    _quiz-is-first.update(false)

    // Render stored question as focus box
    context {
      let q = _quiz-question.get()
      if q != none { _focus-box(q, colors.teal) }
    }
    _quiz-question.update(none)

    // Answer cards
    for (i, item) in items.enumerate() {
      let letter = letters.at(i, default: str(i + 1))
      _quiz-item-correct.update(false)
      place(hide({
        show regex("\\[x\\]"): { _quiz-item-correct.update(true); [] }
        item.body
      }))
      context {
        let is-correct  = _quiz-item-correct.get()
        let item-fill   = if is-correct { tints.green  } else { white }
        let item-stroke = if is-correct { colors.green } else { colors.border }
        let badge-fill  = if is-correct { colors.green } else { colors.teal }
        block(
          width: 100%,
          radius: radius,
          fill: item-fill,
          stroke: 0.6pt + item-stroke,
          inset: (x: padding.lg, y: padding.md),
          grid(
            columns: (26pt, 1fr),
            column-gutter: 10pt,
            align(center + horizon,
              block(width: 24pt, height: 24pt, radius: 12pt, fill: badge-fill,
                align(center + horizon,
                  text(size: fs-small, weight: "bold", fill: white, letter)
                )
              )
            ),
            align(horizon, {
              set text(size: fs-body)
              show regex("\\[[ x]\\]\\s?"): none
              item.body
            }),
          )
        )
        if i < items.len() - 1 { v(gap.xs) }
      }
    }
  }

  body
}
