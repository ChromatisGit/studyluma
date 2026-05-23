# Deployment

## Target Environments

StudyNode supports two deployment targets. Both support full login - PIN hashing uses PBKDF2 via the Web Crypto API, so no native modules are required.

| Target | Notes |
|--------|-------|
| Docker container | Containerized SSR deployment using the shared framework Dockerfile |
| Cloudflare Workers + Neon | Edge deployment, lower latency, free tier available |

---

## Option 1: Docker Deployment

### Prerequisites

- Docker
- PostgreSQL accessible from the container

### Build the image

```sh
bun install
bun run build
docker build -f node_modules/@chromatis/base/infra/docker/Dockerfile -t studynode .
```

The Dockerfile comes from the installed `@chromatis/base` package. No app-local Dockerfile is maintained in this repo.

### Environment

Set the following for the container:

```sh
DATABASE_URL=postgres://user:pass@host:5432/studynode
SESSION_SECRET=<long-random-string>
NODE_ENV=production
```

### Run

```sh
docker run --rm -p 3000:3000 \
  -e DATABASE_URL=postgres://user:pass@host:5432/studynode \
  -e SESSION_SECRET=<long-random-string> \
  -e NODE_ENV=production \
  studynode
```

The app listens on port `3000` inside the container.

---

## Option 2: Cloudflare Workers + Neon Postgres

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) - installed as a dev dependency
- A [Neon](https://neon.tech) database
- Cloudflare account

### 1. Create a Neon database

In the Neon console, create a new project and copy the connection string:

```sh
postgres://user:pass@ep-xxx.eu-central-1.aws.neon.tech/neondb?sslmode=require
```

### 2. Set secrets

```sh
bunx wrangler secret put DATABASE_URL
# Paste the Neon connection string when prompted

bunx wrangler secret put SESSION_SECRET
# Paste any long random string
```

### 3. Initialise the schema

Run `bun run db:init` with `DATABASE_URL` pointed at Neon:

```sh
DATABASE_URL="postgres://..." bun run db:init
```

### 4. Deploy content

In `studynode-content`, point `DATABASE_URL` at Neon and run:

```sh
bun run content:deploy
```

### 5. Build and deploy

```sh
bun run cf:deploy
```

This runs `bun run cf:build` and then `wrangler deploy`.

### Local Cloudflare dev

To test the Workers build locally:

```sh
bun run cf:dev
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Secret key for signing session cookies |
| `NODE_ENV` | No | Use `production` for Docker deployments |
