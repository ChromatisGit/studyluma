# Database

## Technology

PostgreSQL 16. Connection is managed via the `postgres` npm package (v3).

- **Local dev**: Docker Compose, typically started via `bun run db`
- **Production**: Postgres accessible from the chosen deployment target

For the currently supported deployment targets:

- **Docker**: standard Postgres connection via `DATABASE_URL`
- **Cloudflare Workers**: Neon serverless Postgres is the intended target

---

## Schema Overview

### Lookup tables

| Table | Purpose |
|-------|---------|
| `groups` | Student groups (e.g. "TG1", "FTR", "Public") |
| `subjects` | Subject areas (e.g. "math", "info") |
| `course_variants` | Curriculum variants (e.g. "gk", "lk") |

### Course structure

| Table | Purpose |
|-------|---------|
| `courses` | A course instance (group × subject × variant) |
| `topics` | Named topic (e.g. "Differentialrechnung") |
| `chapters` | Named chapter within a topic |
| `worksheets` | A worksheet or slide deck within a chapter |
| `course_topics` | Topic membership + display order + status per course |
| `course_chapters` | Chapter membership + status per course × topic |
| `course_worksheets` | Worksheet membership + visibility flags per course × chapter |

The hierarchy is: `course → topics → chapters → worksheets`.

Worksheet `status` values: `current`, `finished`, `planned`, `locked`.
Chapter `status` values: `current`, `finished`, `locked`.

### Users and authentication

| Table | Purpose |
|-------|---------|
| `users` | User accounts (username + PBKDF2 PIN hash) |
| `user_courses` | Which courses a user is enrolled in |
| `user_progress` | Per-chapter progress status per user |

### Content

| Table | Purpose |
|-------|---------|
| `content_pages` | Parsed Markdown pages stored as JSONB |
| `content_assets` | Binary assets (images) referenced from content, content-addressed by hash. Only populated when the content pipeline uses `asset_driver: postgres` (the default) - see [CONTENT_PIPELINE.md](CONTENT_PIPELINE.md#images--binary-assets) |

### Quiz (TODO temp will be removed from DB)

| Table | Purpose |
|-------|---------|
| `quiz_sessions` | Live quiz session (questions, current phase, current index) |
| `quiz_participants` | Students who have joined a session |
| `quiz_responses` | Individual student answer submissions |

---

## `content_pages` Table

```sql
CREATE TABLE content_pages (
  content_key   TEXT PRIMARY KEY,
  page_kind     TEXT NOT NULL CHECK (page_kind IN ('chapter', 'worksheet', 'practice', 'slides', 'overview')),
  subject_id    TEXT REFERENCES subjects(subject_id),
  topic_id      TEXT REFERENCES topics(topic_id),
  chapter_id    TEXT REFERENCES chapters(chapter_id),
  worksheet_id  TEXT REFERENCES worksheets(worksheet_id),
  title         TEXT NOT NULL DEFAULT '',
  source_format TEXT NOT NULL DEFAULT 'markdown',
  source_path   TEXT NOT NULL DEFAULT '',
  content_json  JSONB NOT NULL,
  content_hash  TEXT NOT NULL DEFAULT '',
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### `content_key` Convention

Keys identify content by type and hierarchy:

| Kind | Key pattern |
|------|------------|
| Chapter overview | `chapter:<subject>:<topicId>:<chapterId>` |
| Worksheet | `worksheet:<subject>:<topicId>:<chapterId>:<worksheetId>` |
| Slides | `slides:<subject>:<topicId>:<chapterId>:<worksheetId>` |
| Practice | `practice:<subject>:<topicId>:<chapterId>` |

Example: `worksheet:math:differenzialrechnung:sekanten:sekanten-aufgaben`

### `content_json` Structure

The JSONB column holds the full parsed page as a `Page` object (see `src/schema/page.ts`):

```json
{
  "title": "Sekanten",
  "content": [
    {
      "header": "Aufgaben",
      "content": [
        { "type": "markdown", "markdown": "Berechne..." },
        {
          "type": "group",
          "macros": [
            { "type": "textTask", "prompt": { "markdown": "..." }, "hint": "...", "solution": "..." }
          ]
        }
      ]
    }
  ]
}
```

---

## Row-Level Security (RLS)

RLS is enabled on all user-facing tables. Access decisions are driven by three session-level parameters set before each query:

| Parameter | Set by |
|-----------|--------|
| `app.user_id` | `userSQL(user)` in `platform/db.server.ts` |
| `app.user_role` | `userSQL(user)` |
| `app.group_key` | `userSQL(user)` |

`anonSQL` does not set these variables and is only used for operations that don't require user context (e.g., login lookups).

---

## Migrations

Migration files live in `sql/migrations/`. They are applied in lexicographic filename order.

```
sql/migrations/
├── 1.0.0__initial.sql           Full initial schema
└── 1.0.1__content_assets.sql    content_assets table
```

### How to add a migration

1. Create a new file: `sql/migrations/1.0.1__description.sql`
2. Write idempotent SQL (use `IF NOT EXISTS`, `IF EXISTS`, `CREATE OR REPLACE`, etc.)
3. Run `bun run db` locally — applies pending migrations to the local database
4. Run `bun run db:deploy` before the next production deployment — shows pending migrations, asks for confirmation, then applies

Applied versions are tracked in the `app_schema_migrations` table. Each migration runs inside a Postgres transaction — if any statement fails, the entire migration rolls back with no partial state.
