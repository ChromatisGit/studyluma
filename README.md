# StudyLuma Website

React Router v7 SSR web application for the StudyLuma learning platform.

## Quick Start

```sh
bun install
cp CONFIG.template.yaml CONFIG.yaml
bun run db                    # start local Postgres and apply schema migrations
bun run dev                   # start dev server at localhost:5173
```

`CONFIG.yaml` is git-ignored and uses named profiles:

```yaml
local:
  database: postgres://studyluma:studyluma@localhost:5432/studyluma_dev
  session_secret: dev

production:
  database: ""        # Neon or self-hosted Postgres connection string
  session_secret: ""  # Long random string, e.g. openssl rand -base64 32
```

The local profile is ready to run after copying the template. To publish on Cloudflare, edit `CONFIG.yaml`, set `production.database` to your Neon or self-hosted Postgres connection string, set `production.session_secret` to a long random value, then run `bun run cf:deploy`.

See [docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for the full setup guide including content deployment.

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run build` | Production build |
| `bun run start` | Start the built SSR server |
| `bun run check` | TypeScript type check + ESLint + architecture boundaries |
| `bun run db` | Start local Postgres and apply pending migrations |
| `bun run db:reset` | Wipe and reinitialize local database |
| `bun run db:deploy` | Apply pending migrations to production database |
| `bun run cf:dev` | Local Cloudflare Workers dev |
| `bun run cf:deploy` | Sync secrets from CONFIG.yaml, build and deploy to Cloudflare |

## Docs

- [Architecture](docs/ARCHITECTURE.md) - Two-repo model, layer rules, auth, content flow
- [Local Development](docs/LOCAL_DEVELOPMENT.md) - Step-by-step setup guide
- [Database](docs/DATABASE.md) - Schema overview, RLS, migrations
- [Content Pipeline](docs/CONTENT_PIPELINE.md) - How content gets from Markdown to DB
- [Markdown Content Format](docs/MARKDOWN_CONTENT_FORMAT.md) - Supported syntax for content authors
- [Deployment](docs/DEPLOYMENT.md) - Docker and Cloudflare Workers deployment
