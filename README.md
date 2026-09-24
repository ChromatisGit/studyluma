# StudyLuma Website — first reviewable slice

This checkout runs the new StudyLuma route set on a fresh PostgreSQL database:
framework username/PIN login and database sessions, course enrollment, topic and
chapter navigation, content publishing, and one saved worksheet response.

The Website currently depends on the sibling local checkout at
`../../framework-planning/chromatis-base-framework`. Its current API has not yet
been published to the framework's GitHub repository. Keep that checkout in
place for installation and builds.

## Local setup

Create an **empty** local PostgreSQL database and set these environment
variables (for example in an ignored `.env` file in this directory):

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
```

Sign in as `student` at `http://localhost:5173/login`. Open Mathematics →
Binomial Formulas → worksheet, save an answer, reload, and confirm it remains.
The worksheet's `/w/:publicKey` link is stable independently of its course path.
Sign in as `outsider` and confirm the course URL returns 404. The first user
created by the seed is the framework admin; the outsider is optional.

`bun run check` and `bun run build` provide static verification. The old
application files remain in the checkout for later extraction/removal, but are
excluded from this route set and TypeScript build. This slice does not yet
implement the full worksheet task renderer, Entra login, lesson frames, or
deterministic content deletion; those are subsequent milestones.
