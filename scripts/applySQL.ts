import { readFile } from "@pipeline/io";
import postgres from "postgres";

const file = ".generatedScripts/courses.sql";

const isVercel = Boolean(process.env.VERCEL);

async function main() {
  const content = (await readFile(file)).trim();
  if (!content) {
    console.log(`[applySQL] ${file} empty, nothing to do`);
    return;
  }

  if (isVercel) {
    const { sql } = await import("@vercel/postgres");
    await sql.query(content);
    console.log(`[applySQL] Applied ${file} via @vercel/postgres (Vercel)`);
    return;
  }

  const url = process.env.POSTGRES_URL;
  if (!url) throw new Error("Missing POSTGRES_URL for local applySQL");

  const sql = postgres(url);
  await sql.unsafe(content);
  await sql.end();

  console.log(`[applySQL] Applied ${file} via postgres (local)`);
}

main().catch((err) => {
  console.error("[applySQL] Failed:", err);
  process.exit(1);
});
