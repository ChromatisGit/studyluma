#let colors = (
  page: rgb(249, 250, 251),
  card: rgb(255, 255, 255),
  text: rgb(17, 24, 39),
  muted: rgb(75, 85, 99),
  subtle: rgb(107, 114, 128),
  border: rgb(229, 231, 235),
  border-strong: rgb(209, 213, 219),
  code-bg: rgb(15, 23, 42),
  code-border: rgb(31, 41, 55),
  option-bg: rgb(248, 250, 252),
  category: (
    Checkpoint: rgb(50, 152, 154),
    Aufgaben: rgb(87, 132, 236),
    Challenges: rgb(235, 128, 35),
  ),
)

#let radius = 4pt
#let pad = (xs: 4pt, sm: 7pt, md: 12pt, lg: 16pt)
#let gap = (sm: 6pt, md: 10pt, lg: 16pt, xl: 22pt)

#let font-body = ("Segoe UI", "Calibri")
#let font-code = ("Cascadia Code", "Cascadia Mono")


#let worksheet-style(body) = {
  // GLOBAL DOC STYLING
  show: doc => {
    set page(
      margin: (top: 2cm, bottom: 1cm, left: 2cm, right: 2cm),
      fill: colors.page,
    )

    set heading(numbering: "1.1.1")
    set text(font: font-body, size: 11pt, fill: colors.text)
    set par(leading: 1em, justify: true)

    doc
  }

  // LEVEL 1 HEADINGS
  show heading.where(level: 1): title => {
    set text(size: 14pt, fill: colors.page)

    let fill-color = colors.category.at(
      title.body.text,
      default: rgb(107, 114, 128),
    )

    let loc = here()
    let pos = loc.position()

    let nextHeading = query(
      selector(heading.where(level: 1)).after(loc),
    ).at(1, default: none)

    let margin = 1cm
    let page-height = 841pt
    let height = page-height - pos.y - margin

    if nextHeading != none {
      let next-pos = nextHeading.location().position()
      if next-pos.page == pos.page {
        height = next-pos.y - pos.y - 10pt
      }
    }

    v(10pt)

    place(
      dx: -18pt,
      block(
        width: 3pt,
        height: height,
        radius: 2pt,
        fill: fill-color,
        inset: (left: 8pt),
      ),
    )

    block(
      width: 100%,
      height: 20pt,
      fill: fill-color,
      radius: radius,
      inset: (left: 8pt),
      [
        #set align(horizon)
        #title.body
      ],
    )
  }

  // LEVEL 2 HEADINGS – numbered circle
  show heading.where(level: 2): title => {
    let num = numbering("1", counter(heading).get().at(1))

    place(
      dx: 10pt,
      dy: 10pt,
      circle(
        radius: 10pt,
        inset: 2pt,
        fill: colors.border,
      )[
        #set align(center)
        #set text(weight: "bold")
        #num
      ],
    )
  }

  // LEVEL 3 HEADINGS – a), b), c) labels
  show heading.where(level: 3): title => {
    let num = numbering("a)", counter(heading).get().at(2))

    place(
      dx: -19pt,
      dy: 0pt,
      [
        #set align(center)
        #set text(weight: "bold")
        #num
      ],
    )
  }

  show raw.where(block: true): it => {
    let txt = raw(it.text, block: false, lang: it.lang)
    box(
      fill: rgb(245, 245, 245),
      stroke: (1pt + rgb(200, 200, 200)),
      inset: (x: 6pt, y: 4pt),
      radius: 2pt,
      text(
        size: 11pt,
        fill: rgb(30, 30, 30),
        [#txt],
      ),
    )
  }

  // IMPORTANT: return the document body so the caller can see it
  body
}

#let group(body) = {
  block(
    width: 100%,
    radius: radius,
    stroke: colors.border,
    fill: colors.card,
    {
      [== 0]
      box(
        inset: (top: 16pt, right: 16pt, bottom: 16pt, left: 40pt),
        [#body],
      )
    },
  )
}

#let info(title, body) = {
  block(
    width: 100%,
    radius: radius,
    stroke: colors.border,
    fill: colors.card,
    {
      place(
        dx: 10pt,
        dy: 10pt,
        circle(
          radius: 10pt,
          inset: 3pt,
          fill: colors.border,
        )[
          #set align(center)
          #set text(weight: "bold")
          i
        ],
      )
      box(
        inset: (top: 16pt, right: 16pt, bottom: 16pt, left: 40pt),
        [
          #title
          #body
        ],
      )
    },
  )
}
}


#let task(body) = [
  #v(4pt)
  === 0
  #box(
    inset: (left: 10pt),
    [#body],
  )
]

#let textTask(body) = {
  task(body)
}

#let mathTask(body) = {
  task(body)
}

#let codeTask(body) = {
  task(body)
}

#let gap(body) = {
  task(body)
}

#let parseGapWithUnderscores(match) = {
  let rawAnswers = match.captures.at(0).split("|")
  let answerLength = rawAnswers.at(0).len()
  let placeholder = "_"
  let index = 0

  while index < answerLength {
    placeholder += "_"
    index += 1
  }

  return placeholder
}

#let parseGapAsAnswerList(match) = {
  let rawAnswers = match.captures.at(0).split("|")
  return "(" + rawAnswers.join(", ") + ")"
}

#let gap(empty: false, body) = {
  let gapPattern  = regex("\{\{((?:[^\{\}\|\s]+\|?)+)\}\}")

  let gapReplacer = if (empty) {parseGapWithUnderscores} else {parseGapAsAnswerList}

  let result = []

  for item in body.children {
    // For code blocks
    if item.has("lang") {
      let newText = item.text.replace(gapPattern, gapReplacer)
      result += raw(
        newText,
        lang: item.lang,
        block: item.at("block", default: false),
      )
      continue
    }
    if item.has("text") {
      result += item.text.replace(gapPattern, gapReplacer)
      continue
    }
    result += item
  }
  task(result)
}

#let mcq(wideLayout: false, shuffleSolutions: true, single: false, body) = {
  task(body)
}

#let starter(body) = [
  #body
]

#let hint(body) = []

#let solution(body) = []

#let validation(body) = []


#show title: set text(size: 17pt)
#show title: set align(center)
