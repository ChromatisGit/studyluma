# Content Pipeline

The `studyluma-content` repository is a standalone build tool. It reads Markdown source files and YAML configuration, then writes parsed course structure and content pages to the Postgres database.

---

## Repo Structure

```
studyluma-content/
├── content/
│   ├── definitions.yml          Groups, subjects, and variant definitions
│   ├── base/                    Subject content (independent of any course)
│   │   └── <subject>/
│   │       └── <topic>/
│   │           ├── chapters.md  Chapter overview + learning goals
│   │           └── <chapter>/
│   │               └── *.md    Worksheet and slide deck files
│   └── courses/                 Course definitions
│       └── <course-id>/
│           └── course.yml       Which topics/chapters to include
└── pipeline/                    TypeScript pipeline code
    ├── preview.ts               Entry point for local deployment
    ├── publish.ts               Entry point for production deployment
    ├── main.ts                  Orchestrator
    ├── config.ts                Reads CONFIG.yaml for database URLs
    ├── configParser/            Loads and validates YAML configs
    ├── markdownParser/          Parses Markdown to typed JSON
    ├── pageParser/              Converts parsed content to DB format
    ├── dataTransformer/         Resolves course structure
    └── db/                      Database write operations
```

---

## Running the Pipeline

```sh
# Local — starts Docker, reads CONFIG.yaml local profile:
bun run preview

# Production — reads CONFIG.yaml production profile, asks for confirmation:
bun run publish
```

---

## What the Pipeline Does

1. **Load configuration** — reads `content/definitions.yml` (groups, subjects, variants) and all `content/courses/*/course.yml` files
2. **Resolve content paths** — maps each course's topic/chapter references to actual Markdown file paths under `content/base/`
3. **Parse Markdown** — converts each `.md` file to a typed `Page` object (title + array of sections + structured macro content)
4. **Resolve course structure** — builds the full hierarchy: course → topics → chapters → worksheets
5. **Write to database**:
   - `deployCourseStructure`: upserts rows in `groups`, `subjects`, `courses`, `topics`, `chapters`, `worksheets`, and junction tables
   - `deployContentPages`: upserts rows in `content_pages` (only re-writes rows whose `content_hash` has changed)

---

## Content Key Convention

Each content page is identified by a key constructed from its hierarchy position:

```
<kind>:<subject>:<topicId>:<chapterId>[:<worksheetId>]
```

Examples:
- `chapter:math:differenzialrechnung:sekanten`
- `worksheet:math:differenzialrechnung:sekanten:grundaufgaben`
- `slides:info:grundlagen-programmieren-ts:variablen:variablen-slides`

The website looks up pages by key via `platform/content.server.ts`.

---

## `definitions.yml`

Defines the global lookup tables. Example structure:

```yaml
groups:
  - id: tg
    label: Technisches Gymnasium
    color: "#4f86c6"
  - id: public
    label: Public
    color: "#888888"

subjects:
  - id: math
    label: Mathematik
    icon: calculator
  - id: info
    label: Informatik
    icon: code

variants:
  - id: gk
    label: Grundkurs
    short: GK
```

---

## `course.yml`

Defines a single course instance:

```yaml
id: public-math
group: public
subject: math
label: Mathematik (öffentlich)
slug: public-math
color: "#4f86c6"
icon: calculator
worksheetFormat: web

topics:
  - id: differenzialrechnung
    status: current
    chapters:
      - id: sekanten
        status: finished
        worksheets:
          - id: grundaufgaben
          - id: zusatzaufgaben
            hidden: true
```

---

## Adding a New Course

1. Create `content/courses/<course-id>/course.yml` following the format above
2. Ensure the referenced `topicId` / `chapterId` directories exist under `content/base/<subject>/`
3. Run `bun run preview`

The pipeline is idempotent — running it multiple times is safe. Unchanged content pages (same hash) are not re-written.

---

## Images / Binary Assets

Images are written with standard Markdown syntax (`![](./diagram.svg)`, relative to the
`.md` file). Since the two repos share no filesystem, the pipeline never copies the file
into `studyluma-website`. Instead, each image is content-addressed - `<sha256-of-bytes>.<ext>`
- and uploaded through an `AssetStore` (`pipeline/assets/`) once parsing finishes. The
website resolves a key back to bytes on request via `GET /content-assets/:key`
(`src/core/assets.server.ts`).

Backend is chosen with `asset_driver` in `CONFIG.yaml` (same profile as `database`) -
**must be set the same way in both repos' `CONFIG.yaml`**:

```yaml
local:
  database: postgres://...
  asset_driver: postgres   # default - no extra setup, stored in the content_assets table.
                            # Fine for small/medium content and local dev.

  # asset_driver: s3       # for deployments with many/large assets. Requires:
  # asset_s3_endpoint: ""
  # asset_s3_bucket: ""
  # asset_s3_region: ""
  # asset_s3_access_key_id: ""
  # asset_s3_secret_access_key: ""
```

`asset_driver: s3` works against any S3-compatible endpoint (Cloudflare R2, MinIO, AWS S3, ...)
via Bun's built-in S3 client - no extra dependency.

There is no per-asset access control - anyone with the key (an unguessable hash) can fetch
it, same trust model as a public CDN link. Course-level access control (public vs. gated
courses) is unaffected, since it's enforced before a content page - and the asset URLs it
contains - is ever sent to the client.

PDFs (`compilePdfToPublic` in `pipeline/io.ts`) do **not** go through this mechanism yet and
still write directly to `studyluma-website/public/.generated/pdf` - which only works when
both repos happen to be sibling directories on the same machine. This is a known gap, not
addressed by the asset store above.

---

## Content Format

See [MARKDOWN_CONTENT_FORMAT.md](MARKDOWN_CONTENT_FORMAT.md) for the full Markdown syntax reference.
