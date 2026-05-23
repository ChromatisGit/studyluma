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

Create `studynode/.env.local` and set:

```
DATABASE_URL=postgres://postgres:postgres@localhost:5432/studynode
SESSION_SECRET=<any-long-random-string>
```

### 5. Start and initialise the database

```sh
bun run db:init
```

This starts the local Postgres 16 container if needed, then runs the migration files in `sql/migrations/` in order and sets up all tables, indexes, functions, views, and RLS policies.

### 6. Deploy content

In the `studynode-content` directory, create `studynode-content/.env.local` with the same `DATABASE_URL`:

```sh
DATABASE_URL=postgres://postgres:postgres@localhost:5432/studynode
```

Then run:

```sh
cd ../studynode-content
bun install
bun run content:deploy
```

This parses all Markdown content and writes it to the database. It takes 10–30 seconds depending on the amount of content.

### 7. Start the dev server

Back in `studynode-website`:

```sh
bun run dev
```

### 8. Open the app

Visit [http://localhost:5173](http://localhost:5173).

---

## Useful commands

| Command | Description |
|---------|-------------|
| `bun run dev` | Start Vite dev server with HMR |
| `bun run typecheck` | TypeScript type check (no emit) |
| `bun run lint` | ESLint + architecture boundary check |
| `bun run build` | Production build |
| `bun run db:init` | Start the local database and apply all migrations |
| `bun run db:reset` | Destroy and recreate the database |

## Adding an admin user

`bun run db:init` starts the local database and creates the schema. It does not create an admin account.

Use the helper script in `studynode`:

```sh
# In studynode:
ADMIN_ACCESS_CODE=ADMIN-CODE ADMIN_PIN=1234 bun run admin:create
```

This writes an `admin` row into `users` using the configured `DATABASE_URL` and stores the PIN as a PBKDF2 hash.

There is also a fixed local seed file in `studynode-content` if you want a prebuilt dev account instead:

```sh
# In studynode-content:
psql "$DATABASE_URL" -f dev-add-admin.sql
```

That seed creates:

- Access code: `dev`
- PIN: `dev`
