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
DATABASE_URL=postgres://studynode:studynode@localhost:5432/studynode_dev
SESSION_SECRET=<any-long-random-string>
```

### 5. Start and initialise the database

```sh
bun run db:init
```

This starts the local Postgres 16 container if needed (`docker compose up -d --wait`), then applies the schema migration and seeds the word list.

### 6. Deploy content

In the `studynode-content` directory, create `studynode-content/.env.local` with the same `DATABASE_URL`:

```sh
DATABASE_URL=postgres://studynode:studynode@localhost:5432/studynode_dev
```

Then run:

```sh
cd ../studynode-content
bun install
bun pipeline/deploy.ts
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
| `bun run db:init` | Apply all schema migrations to `DATABASE_URL` |
| `bun run db:reset` | Destroy and recreate the local database |

## Adding an admin user

`bun run db:init` applies the schema but does not create an admin account.

Use the script in `studynode-content`:

```sh
# In studynode-content:
bun run create-admin
```

This creates an admin with access code `dev` and PIN `dev`. To use different credentials:

```sh
ADMIN_ACCESS_CODE=mycode ADMIN_PIN=5678 bun pipeline/createAdmin.ts
```
