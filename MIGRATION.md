# StudyNode → React Router v7 Migration Plan

## Status
Planning phase. Not started.

## Context
- Source: `C:\dev\StudyNode\website` — Next.js 16 App Router
- Target: React Router v7 + `@platform/framework` (see `C:\dev\reactRouterFramework`)
- Reference implementation: `C:\dev\dropsort` (fully migrated, passing lint + boundary checks)

## Repository Architecture

### Two-repo model
- **`studynode`** (this repo, platform): website code, pipeline, Docker image — maintained by the platform author
- **`studynode-content`** (teacher's repo): Typst source files + config + `package.json` pointing to a versioned `studynode` release — the only repo a teacher ever touches

The teacher never sees or forks the website code. Upgrading the platform is a version bump in their `package.json`.

### How content gets into the app
The pipeline is part of the platform. It runs at build/start time:
1. `studynode compile` — reads Typst source, outputs `.generated/*.json` + `sql/.generated/courses.sql` + PDFs
2. `studynode db:update` — applies the idempotent SQL to the database

All generated files are gitignored. Nothing generated is ever committed.

### Cloudflare Pages (free hosting)
- Teacher connects their content repo to Cloudflare Pages
- Cloudflare build command: `studynode compile && studynode db:update && studynode build`
- Database: Neon.tech free tier (teacher creates one account, sets `DATABASE_URL` env var in Cloudflare)
- Push to content repo → Cloudflare rebuilds and redeploys automatically
- Teacher workflow: edit Typst → `git push` → live in ~2 minutes

### Docker (self-hosted / school on-premise)
- Teacher pulls the official `studynode` Docker image (published by platform author)
- Mounts their `content/` folder as a volume
- On container start: pipeline runs automatically (compile + db:update against local Postgres)
- Postgres runs as a second container via `docker-compose.yml` (provided as a template)
- Update workflow: change content files → `docker restart studynode` → done, no image rebuild
- Data is stored in a named Docker volume (persists across restarts)

### Typst styling
The Typst style library (`typst/`, `types/`) ships with the platform. Teachers get a copy in their content repo template so they can preview PDFs locally — but it is not required for the website build.

---

## Steps

### 1. Survey (prerequisite for all other steps)
Read the following and document findings before writing any code:
- Route tree: all `page.tsx`, `layout.tsx`, `route.ts` under `app/`
- Auth: session handling, middleware, login flow
- DB layer: `@db/runSQL.ts` — how `anonSQL`/`userSQL` RLS pattern works
- Server actions: all `actions.ts` and `use server` functions
- Data fetching: how Server Components call the DB
- Feature modules: top-level dirs under `src/`
- Ably: where realtime is set up and used
- `package.json` dependencies
- `tsconfig.json` path aliases
- `next.config.ts` and `middleware.ts`

### 2. Scaffold
- Replace Next.js with Vite + React Router v7
- Copy `@platform/framework` setup from dropsort (`vite.config.ts`, `react-router.config.ts`, tsconfig structure)
- Wire up `package.json` scripts

### 3. Route config
- Map Next.js file-system routes → `app/routes.ts` declarative config
- Recreate nested layouts as React Router layout routes
- Nested route example from Next.js: `/(app)/[group]/[course]/[topic]/[chapter]/[worksheet]/page.tsx`

### 4. DB layer
- Align `anonSQL`/`userSQL` with `@platform/framework/db` (`withUserContext`, `getDb`)
- Keep RLS semantics — `userSQL` should run queries inside a user context
- Port `@db/runSQL.ts` usages to the framework pattern

### 5. Auth
- Preserve session-cookie + argon2 approach (no JWT replacement needed)
- Replace Next.js middleware auth guard with a framework-compatible loader guard
- Session validation should live in a shared server utility, called from loaders

### 6. Loaders and actions
- Port each `page.tsx` data fetch (Server Component) → `loader` export in the route file
- Port each `actions.ts` / `route.ts` POST handler → `action` export
- Remove all `use server` directives — not used in React Router

### 7. Ably
- Keep Ably client-side; determine if tokens are issued server-side (likely a loader)
- Port any Ably token endpoint (`route.ts`) → React Router `action` or `loader`

### 8. Feature modules
- Move `src/` feature code into the new structure
- Apply architecture boundaries from `C:\dev\reactRouterFramework\infra\scripts\checkArchitectureBoundaries.ts`
- `platform → core/features/app` forbidden; `core → features` forbidden

### 9. Lint + boundary check
- Run `bun run lint` (should include `tsc` + boundary checker)
- Fix any violations before declaring done
