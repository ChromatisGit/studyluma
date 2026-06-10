# Local Development Setup

## Prerequisites

- [Bun](https://bun.sh) 1.x
- [Docker](https://www.docker.com) (for the local Postgres instance)

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

### 4. Configure the project

```sh
cp CONFIG.template.yaml CONFIG.yaml
```

`CONFIG.yaml` is pre-filled with the local database URL. No changes needed to get started. Add your production credentials later when deploying.

### 5. Start and initialise the database

```sh
bun run db
```

This starts the local Postgres 16 container if needed and applies all schema migrations.

### 6. Deploy content

In the `studynode-content` directory:

```sh
cp CONFIG.template.yaml CONFIG.yaml   # local URL is pre-filled
bun install
bun run preview
```

This parses all Markdown content and writes it to the database. Takes 10–30 seconds depending on content volume.

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
| `bun run check` | TypeScript type check + ESLint + architecture boundaries |
| `bun run build` | Production build |
| `bun run db` | Start local database and apply pending migrations |
| `bun run db:reset` | Wipe and reinitialize local database |

## Adding an admin user

`bun run db` applies the schema but does not create an admin account.

Use the script in `studynode-content`:

```sh
# In studynode-content:
bun run create-admin
```

This creates an admin with username `dev` and PIN `dev`. To use different credentials:

```sh
ADMIN_USERNAME=mycode ADMIN_PIN=5678 bun pipeline/createAdmin.ts
```
