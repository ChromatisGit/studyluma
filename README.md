# StudyLuma Website

The Website renders the compiled StudyLuma catalog (schema v1). It never reads author Markdown. Build a catalog with `bun run compile` in `studyluma-content` (Pipeline underneath), then point the Website at the immutable `v1/<buildId>` directory:

```sh
STUDYLUMA_BUNDLE_DIR=../studyluma-content/.generated/studyluma/v1/<buildId> bun run dev
```

Without the variable the Website uses the single build under `studyluma-content/.generated/studyluma/v1`.

## How the pieces fit

- **catalog** — the compiled catalog's types, the server loader, release state (released Inhalt and solutions are held in the running server process) and the redaction students get. Students receive the catalog **without** expected answers, correct options, unreleased solutions, unreleased Inhalt and teacher notes. Tip Merkkarten stay available. The teacher receives the complete catalog.
- **courses** — courses come from `kurse/*.yml` in the content, topics from each topic folder's `thema.yml` (title, icon) and the lesson times from `definitions.yml`. The teacher's arrangement (current chapter, order, additions) is kept in a cookie on top.
- **worksheets** — worksheets, tasks, challenges and checkpoints are rendered straight from the compiled types. Answers are checked on the server (`POST /api/check`), so the browser never holds them. Solution sets (`L = {-4, 2}`, `{}`) and vectors (`vec(3, 4)`) are separate answer kinds: the field takes the parts separated by `;`. `::schritte N` decides the initially visible Plan or Rechenweg per mode (`struktur`), steps stay available as help; `::optional` folds in "Mehr Challenges".
- **lessons** — the presentation mode. A started Foliensatz becomes a `Deck`: its expanded placements as slides (author slides with columns, `::schreiben` areas and cover images; embedded Arbeitsblätter, Quizzes, Merkkarten and the chapter's Inhalt), with private notes, planned times in the presentation's own timeline (`::bis` inside an included Foliensatz counts from where it starts) and where each slide came from. The teacher view, projector window, ink, free surfaces and overview work on slide ids.
- **graphics** — `::grafik` renders a `graphic` rich node with [Mafs](https://mafs.dev) (`content-renderer/ui/Graphic.tsx`): curves and points from compiled math rows, sliders for `parameter`. A `Graph` task uses the Grafik as workspace: each entered function is drawn live and checked on the server against `answers` as a function of `x` (equivalent terms are equal). The math core (`evaluate`, `mathNodes`) lives in the `content-renderer` module so both rendering and checking share it.
- **classroom** — the temporary Classroom Session of a running lesson, on the Chromatis Stateful Runtime. A teacher starts a session (`Klassenzimmer starten`) and gets a four-character join code; students join at `/join/{CODE}` with a name and no account. The module owns the session lifecycle, the Classroom Controller, Participants, released content (Inhalte and solutions), the lesson position, the live quiz and the realtime protocol, plus the teacher controls. See `../CLASSROOM_RUNTIME.md` for the contract and "Classroom Runtime" below for how it runs.

## Classroom Runtime

One Classroom Session is one Chromatis Runtime Instance (`kind: "classroom"`, id: the join code). The domain (`src/modules/classroom/domain`) is plain state transitions; `runtime/classroomRuntime.ts` is the only file that touches the Stateful Runtime contract, so the same code runs on both hosts.

- **Credentials.** Creating a session returns a Controller Token, joining returns a Participant Token. Both are 256-bit random values kept in an HttpOnly cookie (`studyluma-classroom`); the join code only locates a session. The socket route reads the cookie and passes the token to the session as a trusted connection parameter, so tokens never appear in a URL.
- **Realtime.** `/classroom/ws` upgrades to a WebSocket. The server pushes a personalised snapshot after every change plus named events (participant joined/left, position changed, content released, quiz started/revealed/ended, response submitted, session ended). Clients send `intent` frames (`place`, `quiz.advance`, `quiz.end`, `quiz.answer`, `end`); the session authorises each one. A reconnect receives a complete snapshot, so nothing is lost. Without a socket (the Vite dev server) the client polls `GET /classroom`.
- **Join codes.** Case-insensitive, 25 unambiguous characters, drawn with rejection sampling, collisions checked at creation and freed when the session ends. Unknown, ended and expired codes fail identically (404); 20 failed lookups per minute and client are answered with 429. The limiter is process-local.
- **Lifetime.** A session ends when the teacher ends it or after 12 hours. Expiry is enforced on the next touch; the Bun entry also sweeps every minute. State is memory only: a restart ends every session.
- **Released content.** Inhalte, solutions and Inhalt rules live in the session. Server-rendered pages redact the catalog according to the session of the requesting browser; without a session nothing is released.

Run it on Bun/Docker with `bun run build && bun run start` (`server/bun.ts`, a `Dockerfile` is included). `server/cloudflare.ts` and `wrangler.jsonc` are the Cloudflare entry (one Durable Object per session); wiring the Website's own Vite build for Workers is not done yet. `bun run dev` serves everything except the socket.

## Not yet there

Sheet unlocking, mode choice and answers are kept in the browser (`localStorage`); database persistence, sign-in and publishing are still missing. The Session Directory and the `studyluma.org/{CODE}` gateway are a later phase: today the join link points at the instance itself.

Run `bun run check` (typecheck, lint, format, tests) and `bun run build` from this directory.
