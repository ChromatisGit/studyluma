# Deployment

## Target Environments

StudyNode supports two deployment targets.

| Target | Notes |
|--------|-------|
| Docker container | Containerized SSR deployment using the shared framework Dockerfile |
| Cloudflare Workers + Neon | Edge deployment, lower latency, free tier available |

---

## Configuration

Both deployment targets read from `CONFIG.yaml`. Copy the template and fill in your production values:

```sh
cp CONFIG.template.yaml CONFIG.yaml
```

```yaml
local:
  database: postgres://studynode:studynode@localhost:5432/studynode_dev
  session_secret: dev

production:
  database: ""   # Neon or self-hosted Postgres connection string
  session_secret: ""  # openssl rand -base64 32
```

---

## Option 1: Docker Deployment

### Prerequisites

- Docker
- PostgreSQL accessible from the container

### 1. Build the image

```sh
bun install
bun run build
docker build -f node_modules/@chromatis/base/infra/docker/Dockerfile -t studynode .
```

The Dockerfile comes from the installed `@chromatis/base` package.

### 2. Initialise the schema

```sh
bun run db:deploy
```

Shows pending migrations and asks for confirmation before applying. Run this once on a fresh database, and again after each release that includes migrations.

### 3. Deploy content

In `studynode-content`, set the production database URL in `CONFIG.yaml`, then:

```sh
bun run publish
```

### 4. Run

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

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — installed as a dev dependency
- A [Neon](https://neon.tech) database
- Cloudflare account

### 1. Create a Neon database

In the Neon console, create a new project and copy the connection string into `CONFIG.yaml` under `production.database`.

### 2. Initialise the schema

```sh
bun run db:deploy
```

Shows pending migrations and asks for confirmation before applying to Neon.

### 3. Deploy content

In `studynode-content`, set the Neon URL in `CONFIG.yaml` production profile, then:

```sh
bun run publish
```

### 4. Build and deploy

```sh
bun run cf:deploy
```

This syncs all production values from `CONFIG.yaml` as Cloudflare secrets, builds the Workers bundle, and deploys — all in one step.

### Local Cloudflare dev

To test the Workers build locally:

```sh
bun run cf:dev
```

This writes a `.dev.vars` file from your `CONFIG.yaml` local profile and starts Wrangler.

---

## Planned: GitHub Release Artifacts

> TODO (post-alpha): Automate release publishing so teachers never need to clone this repo.

Two artifacts should be published for each tagged release (`v0.x.x`):

**Docker image** — pushed to `ghcr.io/yourorg/studynode:<version>` and `ghcr.io/yourorg/studynode:latest`.
Teachers pull this via the `docker-compose.yml` in `studynode-content` — no build step needed.

**Cloudflare Workers bundle** — the output of `bun run build` zipped and attached as a GitHub release asset.
Teachers download, unzip, and run `wrangler deploy --config wrangler.json` directly — no clone or build needed.

The CI workflow should:
1. On push to a `v*` tag: build both targets
2. Push the Docker image to GHCR with the version tag and `latest`
3. Zip `build/server/` and attach it to the GitHub release

Until this is in place, teachers deploying to Cloudflare need to clone the repo and run `bun run cf:deploy`.

---

## Environment Variables Reference

These are set automatically by `bun run cf:deploy` (synced from `CONFIG.yaml`) or passed manually for Docker.

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Secret key for signing session cookies |
| `NODE_ENV` | No | Use `production` for Docker deployments |
