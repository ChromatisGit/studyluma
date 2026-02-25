/**
 * Incremental course data update script.
 *
 * Applies only the generated course data (sql/.generated/courses.sql)
 * without touching the database schema or user data.
 *
 * Run with: bun scripts/dbUpdate.ts
 *
 * Requires POSTGRES_URL environment variable.
 * Requires bun compile to have been run first.
 */

import { readFile } from "@pipeline/io";
import postgres from "postgres";

const file = "sql/.generated/courses.sql";

async function main() {
  const content = (await readFile(file)).trim();
  if (!content) {
    console.error(
      `[dbUpdate] ${file} is empty or missing. Run 'bun compile' first.`
    );
    process.exit(1);
  }

  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("Missing POSTGRES_URL");

  const sql = postgres(url);
  await sql.unsafe(content);
  await sql.end();

  console.log(`[db-update] Applied ${file}`);
}

main().catch((err) => {
  console.error("[db-update] Failed:", err);
  process.exit(1);
});
