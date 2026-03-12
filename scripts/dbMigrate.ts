/**
 * Incremental schema migration runner.
 *
 * Applies all SQL files in sql/migrations (lexicographical order) and records
 * applied migrations in schema_migrations.
 *
 * Run with: bun scripts/dbMigrate.ts
 *
 * Requires POSTGRES_URL or DATABASE_URL environment variable.
 */

import path from "path";
import { readdir, readFile } from "fs/promises";
import postgres from "postgres";

const MIGRATIONS_DIR = path.resolve(import.meta.dir, "../sql/migrations");

async function main() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("[db-migrate] Missing POSTGRES_URL or DATABASE_URL");
    process.exit(1);
  }

  const sql = postgres(url);

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id         TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `;

    const entries = await readdir(MIGRATIONS_DIR, { withFileTypes: true }).catch(() => []);
    const files = entries
      .filter((e) => e.isFile() && e.name.toLowerCase().endsWith(".sql"))
      .map((e) => e.name)
      .sort((a, b) => a.localeCompare(b));

    if (files.length === 0) {
      console.log("[db-migrate] No migration files found.");
      return;
    }

    for (const file of files) {
      const already = await sql<{ exists: boolean }[]>`
        SELECT EXISTS(
          SELECT 1
          FROM schema_migrations
          WHERE id = ${file}
        ) AS exists
      `;
      if (already[0]?.exists) {
        console.log(`[db-migrate] Skipping ${file} (already applied).`);
        continue;
      }

      const filePath = path.join(MIGRATIONS_DIR, file);
      const content = (await readFile(filePath, "utf-8")).trim();
      if (!content) {
        console.log(`[db-migrate] Skipping ${file} (empty).`);
        continue;
      }

      console.log(`[db-migrate] Applying ${file}...`);
      await sql.begin(async (tx) => {
        await tx.unsafe(content);
        await tx.unsafe("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      });
      console.log(`[db-migrate] Applied ${file}.`);
    }

    console.log("[db-migrate] Done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[db-migrate] Failed:", err);
  process.exit(1);
});
