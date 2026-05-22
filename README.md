# StudyNode Website

React Router v7 SSR web application for the StudyNode learning platform.

## Quick Start

```sh
bun install
cp .env.example .env.local   # set DATABASE_URL and SESSION_SECRET
docker compose up -d          # start local Postgres
bun run db:init               # apply schema migrations
bun run dev                   # start dev server at localhost:5173
```

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for the full setup guide including content deployment.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run build` | Production build |
| `bun run typecheck` | TypeScript type check |
| `bun run lint` | ESLint + architecture boundary check |
| `bun run db:init` | Apply all schema migrations |
| `bun run db:reset` | Drop and recreate the database |
| `bun run cf:dev` | Local Cloudflare Workers dev (Miniflare) |
| `bun run cf:build` | Build for Cloudflare Workers |
| `bun run cf:deploy` | Build and deploy to Cloudflare Workers |

## Docs

- [Architecture](docs/ARCHITECTURE.md) — Two-repo model, layer rules, auth, content flow
- [Local Development](docs/LOCAL_DEVELOPMENT.md) — Step-by-step setup guide
- [Database](docs/DATABASE.md) — Schema overview, RLS, migrations
- [Content Pipeline](docs/CONTENT_PIPELINE.md) — How content gets from Markdown to DB
- [Markdown Content Format](docs/MARKDOWN_CONTENT_FORMAT.md) — Supported syntax for content authors
- [Deployment](docs/DEPLOYMENT.md) — Node.js and Cloudflare Workers deployment
