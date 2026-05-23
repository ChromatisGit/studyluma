import postgres from "postgres";
import { runDbMigrations } from "@chromatis/base/db-migrations";

const url = process.env.DATABASE_URL;
if (!url?.includes("localhost") && !url?.includes("127.0.0.1")) {
  console.error("dbReset: will only run against localhost databases");
  process.exit(1);
}

const sql = postgres(url!);
await sql.unsafe(`
  DROP SCHEMA public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO studynode;
  GRANT ALL ON SCHEMA public TO public;
`);
await sql.end();

await runDbMigrations("init");
console.log("[db-reset] Done.");
