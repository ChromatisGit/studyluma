/**
 * Full database initialization script.
 *
 * Executes each SQL file in the correct order using the postgres library.
 * No \ir metacommand handling needed — each file is executed separately.
 *
 * Requires POSTGRES_URL environment variable.
 *
 * Safety: refuses to run in production unless FORCE_RESET=1 is set.
 * For an annual school year reset against the production database:
 *   POSTGRES_URL=<prod-url> FORCE_RESET=1 bun scripts/dbInit.ts
 */

if (process.env.NODE_ENV === "production" && process.env.FORCE_RESET !== "1") {
  console.error(
    "[db-init] Refusing to run in production. Set FORCE_RESET=1 to override."
  );
  process.exit(1);
}

import path from "path";
import { readFile } from "fs/promises";
import postgres from "postgres";

const SQL = path.resolve(import.meta.dir, "../sql");

async function applyFile(sql: postgres.Sql, filePath: string): Promise<void> {
  const label = path.relative(SQL, filePath).replace(/\\/g, "/");
  const content = (await readFile(filePath, "utf-8")).trim();
  if (!content) {
    console.log(`[db-init] Skipping ${label} (empty)`);
    return;
  }
  console.log(`[db-init] Applying ${label}...`);
  await sql.unsafe(content);
}

async function main() {
  const url = process.env.POSTGRES_URL ?? process.env.DATABASE_URL;
  if (!url) {
    console.error("[db-init] Missing POSTGRES_URL or DATABASE_URL");
    process.exit(1);
  }

  const coursesSQL = path.join(SQL, ".generated", "courses.sql");
  const content = await readFile(coursesSQL, "utf-8").catch(() => null);
  if (!content?.trim()) {
    console.error(
      "[db-init] sql/.generated/courses.sql is empty or missing. Run 'bun compile' first."
    );
    process.exit(1);
  }

  const sql = postgres(url);

  try {
    // 1. Schema: tables, sequences, indexes, RLS policies
    await applyFile(sql, path.join(SQL, "schema.sql"));

    // 2. Seed data
    await applyFile(sql, path.join(SQL, "access_code_words.sql"));

    // 3. Functions (order matters — dependencies first)
    const functions = [
      "generate_access_code.sql",
      "check_and_record_attempt.sql",
      "create_user_account.sql",
      "create_user_with_code.sql",
      "update_course_progress.sql",
      "get_session_user.sql",
      "get_user_for_login.sql",
      "get_user_access_code.sql",
      "enroll_user_in_course.sql",
      "set_registration_open_until.sql",
    ];
    for (const f of functions) {
      await applyFile(sql, path.join(SQL, "functions", f));
    }

    // 4. Views (must exist before functions that query them)
    const views = [
      "v_course_dto.sql",
      "v_user_dto.sql",
      "v_worksheets_by_chapter.sql",
    ];
    for (const v of views) {
      await applyFile(sql, path.join(SQL, "views", v));
    }

    // 5. Aggregation functions (depend on views)
    await applyFile(sql, path.join(SQL, "functions", "get_progress_dto.sql"));
    await applyFile(sql, path.join(SQL, "functions", "get_course_access_groups.sql"));

    // 6. Quiz helper functions
    await applyFile(sql, path.join(SQL, "functions", "try_advance_quiz_phase.sql"));

    // 7. Course data
    console.log("[db-init] Applying courses.sql...");
    await sql.unsafe(content.trim());

    // 7. Local dev admin user — never runs in production, even with FORCE_RESET=1
    if (process.env.NODE_ENV !== "production") {
      await applyFile(sql, path.resolve(import.meta.dir, "../../dev-add-admin.sql"));
    }

    console.log("[db-init] All done.");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[db-init] Failed:", err);
  process.exit(1);
});
