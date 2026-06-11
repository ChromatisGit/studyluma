# Architecture

## Two-Repo Structure

StudyLuma is split across two independent repositories:

| Repo | Purpose |
|------|---------|
| `studyluma-website` | React Router v7 SSR web application |
| `studyluma-content` | Markdown content source + build pipeline |

The repos are completely independent. The **only coupling** between them is the database: the content pipeline writes to the Postgres database, and the website reads from it.

```
studyluma-content          studyluma-website
     │                           │
     │ bun run preview / publish │  bun run dev / deploy
     │                           │
     └──────► Postgres ◄─────────┘
```

---

## studyluma-website

### Framework

Built on **React Router v7** with SSR enabled. Vite handles both client and server bundling.

A custom framework is declared as a `file:` dependency (`@chromatis/base`) and installed via `bun install`. It provides Vite config helpers, ESLint config, and the base TypeScript config.

### Source Layout

```
src/
├── core/           Route handlers (thin loaders/actions calling services)
├── features/       UI feature modules (one folder per feature)
├── macros/         Content macro definitions and renderers
├── platform/       Application-level infrastructure (DB, auth, sessions)
├── schema/         Shared TypeScript types (no runtime code)
├── server/         Server-only business logic (services, DB layer)
└── ui/             Shared UI components and layout
```

### Layer Rules

The architecture is enforced by `scripts/checkArchitectureBoundaries.ts` and ESLint's `eslint-plugin-boundaries`:

- `features/` modules are **isolated** — no cross-feature imports
- `features/` may import from `ui/`, `macros/`, `schema/`
- `server/` code is **never** imported by `features/` or `ui/`
- `platform/` is only imported from route files in `src/core/` and `app/`
- `macros/` may import `features/` for rendering but not `server/` or `platform/`

### Platform Layer (`src/platform/`)

Thin wrappers around framework primitives:

- **`db.server.ts`** — Postgres singleton; exports `anonSQL` (no RLS context) and `userSQL(user)` (sets RLS session vars before each query)
- **`auth/`** — Session cookie management, PIN-based login, route guards (`assertLoggedIn`, `assertAdminAccess`)
- **`content.server.ts`** — Typed accessors for `content_pages` rows (`getContentPage`, `getWorksheetContent`, `getSlideDeckContent`, …)
- **`index.server.ts`** — Re-exports the above for consumption by route files

### Authentication

Users authenticate with a username + PIN. The PIN is hashed with **PBKDF2** via the Web Crypto API (`hashPin`/`verifyPin` from `@chromatis/base/auth`) — no native modules, works on both Node.js and Cloudflare Workers.

On successful login, a signed session cookie is issued. The cookie stores only a `user_id`; the platform layer resolves the full `UserDTO` on every request.

### Database

PostgreSQL everywhere:

- **Local dev**: Docker Compose, typically started via `bun run db`
- **Docker deployment**: standard Postgres connection via `DATABASE_URL`
- **Cloudflare deployment**: Neon serverless Postgres (compatible with Cloudflare Workers via HTTP)

All writes go through `userSQL(user)` which sets three session-level parameters before executing:

```sql
SET app.user_id   = '<id>';
SET app.user_role = '<role>';
SET app.group_key = '<key>';
```

Row-Level Security policies on each table use these parameters to enforce access control — no application-level filtering needed.

### Content

Content pages are stored as parsed JSONB in the `content_pages` table. The website only reads the pre-parsed JSON produced by the pipeline. At request time, `platform/content.server.ts` fetches the relevant row and the React Router loader passes it to the renderer.

### Realtime

Not implemented yet ToDo

---

## studyluma-content

### Structure

```
content/
├── definitions.yml          Groups, subjects, and variant definitions
├── base/                    Subject-organised content (math/, info/, …)
│   └── <subject>/<topic>/<chapter>/
│       ├── chapters.md      Chapter overview (title, learning goals)
│       └── <worksheets>/    Worksheet and slide Markdown files
└── courses/                 Course definitions (which base content to include)
    └── <course-id>/
        └── course.yml

pipeline/                    Build pipeline (TypeScript)
```

### Pipeline

`bun run preview / publish` reads the YAML course definitions and all Markdown source files, parses them into typed JSON, and writes course structure + content pages to the database. See [CONTENT_PIPELINE.md](CONTENT_PIPELINE.md).
