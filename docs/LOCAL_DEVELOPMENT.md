# Local Development Setup

## Prerequisites

- [Bun](https://bun.sh) 1.x
- [Docker](https://www.docker.com) (for the local Postgres instance)
- Node.js 20+ (needed for `bun run db:init` and related scripts)

---

## Step-by-step

### 1. Clone the website repo

```sh
git clone <studynode-website-url>
cd studynode-website
```

### 2. Clone the content repo (separately)

```sh
git clone <studynode-content-url>
# Keep it as a sibling — the pipeline runs independently
```

### 3. Install dependencies

```sh
# In studynode-website:
bun install
```

### 4. Configure environment

```sh
cp .env.example .env.local
```

Open `.env.local` and set:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/studynode
SESSION_SECRET=<any-long-random-string>
```

### 5. Start the database

```sh
docker compose up -d
```

This starts a Postgres 16 container on port 5432.

### 6. Initialise the schema

```sh
bun run db:init
```

This runs the migration files in `sql/migrations/` in order and sets up all tables, indexes, functions, views, and RLS policies.

### 7. Deploy content

In the `studynode-content` directory:

```sh
cd ../studynode-content
bun install
cp .env.example .env.local  # set the same DATABASE_URL
bun run content:deploy
```

This parses all Markdown content and writes it to the database. It takes 10–30 seconds depending on the amount of content.

### 8. Start the dev server

Back in `studynode-website`:

```sh
bun run dev
```

### 9. Open the app

Visit [http://localhost:5173](http://localhost:5173).

---

## Useful commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run typecheck` | TypeScript type check (no emit) |
| `bun run lint` | ESLint + architecture boundary check |
| `bun run build` | Production build |
| `bun run db:init` | Apply all migrations |
| `bun run db:reset` | Destroy and recreate the database |

## Adding an admin user

After `db:init`, insert an admin user directly:

```sql
-- Run against the local database (e.g. via psql or a DB GUI)
INSERT INTO users (id, role, access_code, pin_hash)
VALUES (
  gen_random_uuid(),
  'admin',
  'ADMIN-CODE',
  '<argon2-hash-of-your-pin>'
);
```

Or use the helper script in `studynode-content`:

```sh
# In studynode-content:
psql "$DATABASE_URL" -f dev-add-admin.sql
```
