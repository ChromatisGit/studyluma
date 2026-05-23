import postgres from "postgres";
import { hashPin } from "@chromatis/base/auth";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const pin = process.env.ADMIN_PIN;
if (!pin || pin.length < 4) {
  console.error("ADMIN_PIN env var required (min 4 chars)");
  process.exit(1);
}

const accessCode = process.env.ADMIN_ACCESS_CODE;
if (!accessCode) {
  console.error("ADMIN_ACCESS_CODE is not set");
  process.exit(1);
}

const sql = postgres(DATABASE_URL);

try {
  const pinHash = await hashPin(pin);
  const id = crypto.randomUUID();

  // Delete any existing admin with this access code first (idempotent re-run)
  await sql`DELETE FROM users WHERE access_code = ${accessCode}`;

  await sql`
    INSERT INTO users (id, role, group_key, access_code, pin_hash)
    VALUES (${id}, 'admin', NULL, ${accessCode}, ${pinHash})
  `;

  // Verify the row is readable
  const [row] = await sql<{ id: string; role: string }[]>`
    SELECT id, role FROM users WHERE access_code = ${accessCode}
  `;

  if (!row) {
    console.error("Insert appeared to succeed but row is not visible — possible RLS issue.");
    console.error("Try connecting as a superuser or using a service role.");
    process.exit(1);
  }

  console.log("Admin created and verified.");
  console.log("  access code:", accessCode);
  console.log("  pin:        ", pin);
  console.log("  id:         ", row.id);
  console.log("  role:       ", row.role);
} catch (err) {
  console.error("Failed:", err);
  process.exit(1);
} finally {
  await sql.end();
}
