import postgres from "postgres";
import { createBunRuntime } from "@chromatis/base/runtime";
import { adminUrlSecret, databaseUrlSecret, migrationUrlSecret, requireWebsiteSecret } from "../../src/app/config/secrets";

const secrets = createBunRuntime({ ...process.env, NODE_ENV: "local" }).secrets;
const adminUrl = requireWebsiteSecret(adminUrlSecret, secrets);
const runtimeUrl = requireWebsiteSecret(databaseUrlSecret, secrets);
const migrationUrl = requireWebsiteSecret(migrationUrlSecret, secrets);

const admin = new URL(adminUrl);
const runtime = new URL(runtimeUrl);
const migration = new URL(migrationUrl);
if (![admin, runtime, migration].every(url => new Set(["localhost", "127.0.0.1", "::1"]).has(url.hostname))) {
  throw new Error("Provisioning is restricted to local PostgreSQL");
}
if (admin.pathname !== runtime.pathname || admin.pathname !== migration.pathname) throw new Error("All three URLs must refer to the same database");
if (decodeURIComponent(runtime.username) !== "chromatis_app" || decodeURIComponent(migration.username) !== "chromatis_migrator") {
  throw new Error("Runtime and migration URLs must use chromatis_app and chromatis_migrator");
}

const sql = postgres(adminUrl, { max: 1 });
try {
  await sql.unsafe(`
    DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chromatis_migrator') THEN
        CREATE ROLE chromatis_migrator LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'chromatis_app') THEN
        CREATE ROLE chromatis_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS;
      END IF;
    END $$;
  `);
  const credentials: Array<[string, string]> = [["chromatis_app", decodeURIComponent(runtime.password)], ["chromatis_migrator", decodeURIComponent(migration.password)]];
  for (const [role, password] of credentials) {
    if (!password) throw new Error(`Password missing for ${role}`);
    const [row] = await sql<Array<{ statement: string }>>`SELECT format('ALTER ROLE %I PASSWORD %L', ${role}::text, ${password}::text) AS statement`;
    if (!row) throw new Error(`Unable to configure ${role}`);
    await sql.unsafe(row.statement);
  }
  const databaseName = decodeURIComponent(admin.pathname.slice(1));
  await sql`ALTER DATABASE ${sql(databaseName)} OWNER TO chromatis_migrator`;
  await sql.unsafe("REVOKE CREATE ON SCHEMA public FROM PUBLIC");
  await sql.unsafe("ALTER SCHEMA public OWNER TO chromatis_migrator");
  await sql`GRANT CONNECT ON DATABASE ${sql(databaseName)} TO chromatis_app`;
  await sql.unsafe("GRANT USAGE ON SCHEMA public TO chromatis_app");
  console.log("Local framework database roles are ready");
} finally {
  await sql.end();
}
