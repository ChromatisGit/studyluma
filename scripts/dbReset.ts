import postgres from "postgres";
import { readFileSync } from "fs";
import { join } from "path";

const { DATABASE_URL } = process.env;
if (!DATABASE_URL) throw new Error("DATABASE_URL is not set");

const sql = postgres(DATABASE_URL, { max: 1 });
const root = join(import.meta.dir, "..");

try {
  await sql`DROP SCHEMA public CASCADE`;
  await sql`CREATE SCHEMA public`;
  await sql.unsafe(readFileSync(join(root, "sql/migrations/1.0.0__initial.sql"), "utf-8"));
  await sql.unsafe(readFileSync(join(root, "sql/seeds/access_code_words.sql"), "utf-8"));
  console.log("Database reset.");
} finally {
  await sql.end();
}
