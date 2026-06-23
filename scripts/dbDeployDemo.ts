import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { existsSync, readFileSync } from "node:fs";
import { parse } from "yaml";

import { getPendingMigrations, applyMigrations } from "@chromatis/base/db-migrations";

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

const { pending, sql } = await getPendingMigrations(url);

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

await applyMigrations(sql, pending);
console.info(`[db] Applied ${pending.length} migration${pending.length === 1 ? "" : "s"}.`);
await sql.end();
