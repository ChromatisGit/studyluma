# StudyLuma Website

React Router (SSR) app for StudyLuma: course views, worksheets and lesson
frames. It is a modular monolith on top of
[`@chromatis/base`](https://github.com/ChromatisGit/chromatis-base-framework),
whose UI components and CSS provide almost all styling; StudyLuma adds a
theme (`app/theme.css`) and CSS only for its own elements.

This stage renders the UI from JSON fixtures. There is no database, login
or content pipeline yet; the viewer role (student or teacher) is a cookie
set by the view switch at the bottom of the sidebar.

## Layout

```
app/                   composition root: root, shell, routes, theme
src/helper/            tiny shared helpers (text templates)
src/modules/<module>/  one module per area; only index.ts at its root
  domain/              types and pure rules
  application/         use cases on top of the domain
  infrastructure/      fixtures, local storage, browser channels
  ui/                  React components, *.de.json texts, module CSS
```

| Module | Owns |
| --- | --- |
| `viewer` | the stubbed viewer role and the view switch |
| `content` | Markdown with Typst math, Merkkarten, summaries, code blocks |
| `courses` | course list, Lernweg, chapter page, course fixtures |
| `worksheets` | worksheet renderer, math editor, checking, teacher tools |
| `lessons` | lesson frames, teacher view, projector window |

Modules import each other only through their `index.ts`
(`chromatis/dependencies` lint rule). All user-visible text lives in a
`*.de.json` file next to the component that shows it.

## Routes

| Path | Page |
| --- | --- |
| `/` | my courses |
| `/courses/:courseId` | Lernweg |
| `/courses/:courseId/chapters/:chapterId` | chapter page |
| `…/sheets/:sheetId` | worksheet |
| `…/challenges` | challenges of a chapter |
| `…/lesson` | lesson frames, teacher view |
| `…/lesson/projector` | projector window |
| `/viewer` | POST: switch the stubbed role |

## Development

```sh
bun install
bun run dev      # http://localhost:5173
bun run check    # typecheck, lint, format, tests
```
