# StudyLuma Website — first reviewable slice

This checkout runs the new StudyLuma route set on a fresh PostgreSQL database:
framework username/PIN login and database sessions, course enrollment, topic and
chapter navigation, content publishing, and one saved worksheet response.

The Website pins a Framework revision that provides database-backed sessions.
The [private Demo repository](https://github.com/ChromatisGit/studyluma-demo)
consumes this Website package and owns demo-specific data and deployment setup.

## Configuration

Non-secret Website settings live in `src/app/config/config.toml`. The
`[default]` table applies everywhere; `[local]`, `[test]`, and `[production]`
may override its values. The framework's `parseConfig` validates the merged
values against the strict schema in `src/app/config/config.ts`. `NODE_ENV`
selects the environment; Vite's `development` mode maps to `local`.

Database URLs, `PUBLISH_TOKEN`, and seed PINs are defined and validated with
the framework secrets API in `src/app/config/secrets.ts`. Supply their values
through process environment injection (for example from a local credential
manager or CI secrets) or Cloudflare Worker bindings. No `.env` file is needed.
The framework validates and reads injected values; it does not store them.
`bun run config:check` validates the checked-in TOML for every environment.

## Local setup

Create an **empty** local PostgreSQL database and inject these values into the
commands' process environments through your credential manager or shell:

```sh
DATABASE_ADMIN_URL=postgres://postgres:<admin-password>@localhost:5432/studyluma_dev
DATABASE_URL=postgres://chromatis_app:<runtime-password>@localhost:5432/studyluma_dev
DATABASE_MIGRATION_URL=postgres://chromatis_migrator:<migration-password>@localhost:5432/studyluma_dev
PUBLISH_TOKEN=<long-random-token>
SEED_ADMIN_USER=teacher
SEED_ADMIN_PIN=<local-teacher-pin>
SEED_STUDENT_USER=student
SEED_STUDENT_PIN=<local-student-pin>
SEED_OUTSIDER_USER=outsider
SEED_OUTSIDER_PIN=<local-outsider-pin>
```

Use distinct passwords for the two database roles. `DATABASE_ADMIN_URL` must
connect as a role that can create roles and change database ownership. The
provision and seed scripts refuse non-local databases.

Run from the Website directory:

```sh
bun install
bun run db:provision
bun run db:apply
bun run dev
```

With the app running, publish the sample chapter from `studyluma-content`:

```sh
cd ../studyluma-content
STUDYLUMA_URL=http://localhost:5173 PUBLISH_TOKEN=<same-token> bun run publish:milestone
```

Then from the Website directory:

```sh
bun run seed:milestone
bun run verify:milestone
bun run verify:milestone:rls
```

Set `STUDYLUMA_URL` to the local Website URL for `verify:milestone`, and set
all three `SEED_*_USER`/`SEED_*_PIN` pairs. The HTTP check signs in as each
user, verifies course and worksheet access, then saves and reloads a student
answer. The RLS check uses `DATABASE_URL`, `DATABASE_MIGRATION_URL`,
`SEED_STUDENT_USER`, and `SEED_OUTSIDER_USER`. It temporarily removes the
student enrollment, verifies that the saved answer becomes invisible, and
restores the enrollment before exiting. Both checks are restricted to local
hosts.

Sign in as `student` at `http://localhost:5173/login`. Open Mathematics →
Binomial Formulas → worksheet, save an answer, reload, and confirm it remains.
The worksheet's `/w/:publicKey` link is stable independently of its course path.
Sign in as `outsider` and confirm the course URL returns 404. The first user
created by the seed is the framework admin; the outsider is required for the
verification commands.

`bun run check` and `bun run build` provide static verification. The old
application files remain outside the active route set and TypeScript build.
Demo-specific source and data have moved to the Demo repository. This slice does not yet
implement the full worksheet task renderer, Entra login, lesson frames, or
deterministic content deletion; those are subsequent milestones.
