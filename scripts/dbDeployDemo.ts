import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parse } from "yaml";
import postgres from "postgres";

type MigrationFile = {
  version: string;
  description: string;
  filename: string;
  sql: string;
};

const MIGRATION_FILE_RE = /^(\d+\.\d+\.\d+)__([a-z0-9][a-z0-9_-]*)\.sql$/i;

function loadMigrationFiles(
  migrationsDir = path.resolve(process.cwd(), "sql/migrations"),
): MigrationFile[] {
  if (!existsSync(migrationsDir)) return [];

  return readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && MIGRATION_FILE_RE.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b))
    .map((name) => {
      const match = MIGRATION_FILE_RE.exec(name);
      if (!match) throw new Error(`Invalid migration filename: ${name}`);
      const version = match[1];
      const descriptionSlug = match[2];
      if (!version || !descriptionSlug) {
        throw new Error(`Invalid migration filename: ${name}`);
      }

      return {
        version,
        description: descriptionSlug.replace(/-/g, " "),
        filename: name,
        sql: readFileSync(path.join(migrationsDir, name), "utf8"),
      };
    });
}

async function ensureMigrationTable(sql: postgres.Sql): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS app_schema_migrations (
      version     text        PRIMARY KEY,
      description text        NOT NULL,
      applied_at  timestamptz NOT NULL DEFAULT now()
    )
  `;
}

async function getAppliedVersions(sql: postgres.Sql): Promise<Set<string>> {
  const rows = await sql<{ version: string }[]>`
    SELECT version FROM app_schema_migrations ORDER BY applied_at ASC, version ASC
  `;
  return new Set(rows.map((row) => row.version));
}

const configPath = "CONFIG.yaml";
if (!existsSync(configPath)) {
  console.error("CONFIG.yaml not found. Copy CONFIG.template.yaml and fill in the demo section.");
  process.exit(1);
}

const config = parse(readFileSync(configPath, "utf8")) as Record<string, Record<string, string>>;
const url = config.demo?.database;

if (!url) {
  console.error('CONFIG.yaml is missing the "demo" database URL.');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
await ensureMigrationTable(sql);

const migrations = loadMigrationFiles();
const applied = await getAppliedVersions(sql);
const pending = migrations.filter((migration) => !applied.has(migration.version));

if (pending.length === 0) {
  console.info("[db] Demo database is up to date.");
  await sql.end();
  process.exit(0);
}

console.info("\nPending migrations:");
for (const m of pending) {
  console.info(`  ${m.filename}`);
}

const skipConfirm = process.argv.includes("--yes") || process.argv.includes("-y");

if (!skipConfirm) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = await rl.question("\nApply to demo database? [y/N]: ");
  rl.close();

  if (answer.trim().toLowerCase() !== "y") {
    console.info("Aborted.");
    await sql.end();
    process.exit(0);
  }
}

await sql.begin(async (tx) => {
  const txSql = tx as unknown as postgres.Sql;

  await txSql`SELECT pg_advisory_xact_lock(23117, 40873)`;
  await ensureMigrationTable(txSql);

  for (const migration of pending) {
    console.info(`[db] Applying ${migration.version}: ${migration.description}`);
    const trimmed = migration.sql.trim();
    if (trimmed) await txSql.unsafe(trimmed);
    await txSql`
      INSERT INTO app_schema_migrations (version, description)
      VALUES (${migration.version}, ${migration.description})
      ON CONFLICT (version) DO NOTHING
    `;
  }
});

console.info(`[db] Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
await sql.end();
