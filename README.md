# StudyLuma website

React Router 7 SSR application. The current project state, architecture
direction, and candidate work are in the planning repository's
[PROJECT.md](../PROJECT.md). Check source before assuming a planned feature
exists.

For local development, install Bun and Docker, then from this directory:

```sh
bun install
cp CONFIG.template.yaml CONFIG.yaml
bun run db
bun run dev
```

The app starts at `http://localhost:5173`. Run `bun run check` for type,
lint, and architecture checks. The separate `studyluma-content` product loads
course material into the same local database with `bun run preview`.

`CONFIG.yaml` is ignored and contains database and session credentials. The
website uses `@chromatis/base`; a local Bun link may be replaced by an
install. Deployment scripts are listed in `package.json` and target
Cloudflare Workers or the framework Docker setup.
