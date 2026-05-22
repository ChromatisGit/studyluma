# Deployment

## Target Environments

StudyNode supports two deployment targets. Both support full login — PIN hashing uses PBKDF2 via the Web Crypto API (no native modules required).

| Target | Notes |
|--------|-------|
| Node.js (PM2 / VPS) | Traditional deployment, full Node.js API surface |
| Cloudflare Workers + Neon | Edge deployment, lower latency, free tier available |

---

## Option 1: Node.js Deployment

### Prerequisites

- Node.js 20+ or Bun 1.x on the server
- PostgreSQL accessible from the server
- PM2 or another process manager (optional but recommended)

### Build

```sh
bun run build
```

Output goes to `build/`.

### Environment

Set the following on the server:

```
DATABASE_URL=postgres://user:pass@host:5432/studynode
SESSION_SECRET=<long-random-string>
NODE_ENV=production
```

### Run

```sh
# Direct start:
node build/server/index.js

# Or with PM2:
pm2 start build/server/index.js --name studynode
pm2 save
```

The server listens on port `3000` by default. Put Nginx or Caddy in front as a reverse proxy.

---

## Option 2: Cloudflare Workers + Neon Postgres

### Prerequisites

- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) — installed as a dev dependency (`bun run wrangler`)
- A [Neon](https://neon.tech) database (free tier available)
- Cloudflare account

### 1. Create a Neon database

In the Neon console, create a new project and copy the connection string:

```
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

Run `bun run db:init` with `DATABASE_URL` pointed at Neon (set it in `.env.local` or export it):

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

This runs `bun run cf:build` (Vite + React Router build with the Cloudflare Vite plugin) and then `wrangler deploy`.

### Local Cloudflare dev

To test the Workers build locally (uses Miniflare):

```sh
bun run cf:dev
```

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `SESSION_SECRET` | Yes | Secret key for signing session cookies |
| `NODE_ENV` | No | `production` in production builds |
