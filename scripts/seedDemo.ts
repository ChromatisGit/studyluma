import { readFileSync, existsSync } from "node:fs";
import { parse } from "yaml";
import postgres from "postgres";

const local = process.argv.includes("--local");
const profile = local ? "local" : "demo";

const configPath = "CONFIG.yaml";
if (!existsSync(configPath)) {
  console.error("CONFIG.yaml not found. Copy CONFIG.template.yaml and fill in the demo section.");
  process.exit(1);
}

const config = parse(readFileSync(configPath, "utf8")) as Record<string, Record<string, string>>;
const section = config[profile];

if (!section?.database) {
  console.error(`CONFIG.yaml is missing the "${profile}" database URL.`);
  process.exit(1);
}

const sql = postgres(section.database);

try {
  console.log(`[seed-demo] Applying course structure (${profile})...`);
  await sql.unsafe(readFileSync("sql/demo/courses.sql", "utf8"));

  console.log(`[seed-demo] Applying seed data (${profile})...`);
  await sql.unsafe(readFileSync("sql/demo/seed.sql", "utf8"));

  console.log("[seed-demo] Done.");
} finally {
  await sql.end();
}
