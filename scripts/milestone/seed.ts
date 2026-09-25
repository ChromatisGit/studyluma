import postgres from "postgres";
import { loginUser, registerUser, setUserEnabled } from "@chromatis/base/auth";
import { createDatabase } from "@chromatis/base/database";
import { createBunRuntime } from "@chromatis/base/runtime";
import { readSecret } from "@chromatis/base/secrets";
import {
  adminPinSecret,
  databaseUrlSecret,
  migrationUrlSecret,
  outsiderPinSecret,
  requireWebsiteSecret,
  studentPinSecret,
} from "../../src/app/config/secrets";

const secrets = createBunRuntime({ ...process.env, NODE_ENV: "local" }).secrets;
const runtimeUrl = requireWebsiteSecret(databaseUrlSecret, secrets);
const migrationUrl = requireWebsiteSecret(migrationUrlSecret, secrets);
const adminName = process.env.SEED_ADMIN_USER;
const adminPin = requireWebsiteSecret(adminPinSecret, secrets);
const studentName = process.env.SEED_STUDENT_USER;
const studentPin = requireWebsiteSecret(studentPinSecret, secrets);
const outsiderName = process.env.SEED_OUTSIDER_USER;
const outsiderPin = readSecret(outsiderPinSecret, secrets);
if (!adminName || !studentName) {
  throw new Error("SEED_ADMIN_USER and SEED_STUDENT_USER are required");
}
if (
  !new Set(["localhost", "127.0.0.1", "::1"]).has(new URL(runtimeUrl).hostname)
) {
  throw new Error("The milestone seed is restricted to a local database");
}

const db = createDatabase(runtimeUrl, {
  runtime: "bun",
  environment: "local",
  migrationConnectionString: migrationUrl,
});
async function ensureUser(username: string, pin: string) {
  const result = await registerUser(db.anonSQL, { username, pin });
  if (result.status === "registered") {
    return result.user;
  }
  if (result.status === "pending_approval") {
    const existing = await loginUser(db.anonSQL, username, pin);
    if (existing.status !== "disabled") {
      throw new Error(`Unable to create ${username}`);
    }
    const rows = await db.anonSQL<
      Array<{ id: string }>
    >`SELECT id FROM users WHERE username = ${username}`;
    const id = rows[0]?.id;
    if (!id) {
      throw new Error(`Missing new user ${username}`);
    }
    await setUserEnabled(db.anonSQL, id, true);
    return { id };
  }
  const existing = await loginUser(db.anonSQL, username, pin);
  if (existing.status !== "ok") {
    throw new Error(`Existing credentials do not match for ${username}`);
  }
  return existing.user;
}

await ensureUser(adminName, adminPin);
const student = await ensureUser(studentName, studentPin);
if (Boolean(outsiderName) !== Boolean(outsiderPin)) {
  throw new Error("Set both SEED_OUTSIDER_USER and SEED_OUTSIDER_PIN");
}
if (outsiderName && outsiderPin) {
  await ensureUser(outsiderName, outsiderPin);
}
const sql = postgres(migrationUrl, { max: 1 });
try {
  await sql.begin(async (tx) => {
    const query = tx as unknown as typeof sql;
    const [chapter] = await query<
      Array<{ id: string }>
    >`SELECT id FROM chapters WHERE id = 'binomische-formeln-einstieg'`;
    if (!chapter) {
      throw new Error(
        "Publish the milestone bundle before seeding course assignments",
      );
    }
    await query`INSERT INTO courses (id, title) VALUES ('math-demo', 'Mathematik') ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title`;
    await query`INSERT INTO course_chapters (course_id, chapter_id) VALUES ('math-demo', ${chapter.id}) ON CONFLICT DO NOTHING`;
    await query`INSERT INTO course_enrollments (user_id, course_id) VALUES (${student.id}::uuid, 'math-demo') ON CONFLICT DO NOTHING`;
  });
} finally {
  await sql.end();
}
console.log(
  `Milestone ready: sign in as ${studentName} and open /courses/math-demo`,
);
process.exit(0);
