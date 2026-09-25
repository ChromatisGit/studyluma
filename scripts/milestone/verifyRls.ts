import { strict as assert } from "node:assert";
import postgres from "postgres";

const runtimeUrl = process.env.DATABASE_URL;
const migrationUrl = process.env.DATABASE_MIGRATION_URL;
const studentName = process.env.SEED_STUDENT_USER;
const outsiderName = process.env.SEED_OUTSIDER_USER;
if (!runtimeUrl || !migrationUrl || !studentName || !outsiderName) {
  throw new Error("DATABASE_URL, DATABASE_MIGRATION_URL, SEED_STUDENT_USER and SEED_OUTSIDER_USER are required");
}
if (![runtimeUrl, migrationUrl].every(url => ["localhost", "127.0.0.1", "::1"].includes(new URL(url).hostname))) {
  throw new Error("RLS verification is restricted to a local database");
}

const runtime = postgres(runtimeUrl, { max: 1 });
const migrator = postgres(migrationUrl, { max: 1 });
const courseId = "math-demo";
const worksheetId = "binomische-formeln-erste-uebung";

async function visibleResponseCount(userId: string): Promise<number> {
  return runtime.begin(async tx => {
    const query = tx as unknown as typeof runtime;
    await query`SELECT set_config('app.user_id', ${userId}, true)`;
    const [row] = await query<Array<{ count: number }>>`
      SELECT count(*)::integer AS count FROM worksheet_responses
      WHERE user_id = ${userId}::uuid AND worksheet_id = ${worksheetId}
    `;
    return row?.count ?? 0;
  });
}

try {
  const users = await migrator<Array<{ id: string; username: string }>>`
    SELECT id, username FROM users WHERE username IN (${studentName}, ${outsiderName})
  `;
  const studentId = users.find(user => user.username === studentName)?.id;
  const outsiderId = users.find(user => user.username === outsiderName)?.id;
  assert.ok(studentId && outsiderId, "seeded student and outsider must exist");
  assert.equal(await visibleResponseCount(studentId), 1, "enrolled student must see the saved answer");
  assert.equal(await visibleResponseCount(outsiderId), 0, "outsider must not see a response");
  let outsiderWriteDenied = false;
  try {
    await runtime.begin(async tx => {
      const query = tx as unknown as typeof runtime;
      await query`SELECT set_config('app.user_id', ${outsiderId}, true)`;
      await query`
        INSERT INTO worksheet_responses (user_id, worksheet_id, answer)
        VALUES (${outsiderId}::uuid, ${worksheetId}, 'unauthorized verification answer')
      `;
      throw new Error("Outsider response write unexpectedly succeeded");
    });
  } catch (error) {
    if ((error as { code?: string }).code === "42501") outsiderWriteDenied = true;
    else throw error;
  }
  assert.ok(outsiderWriteDenied, "outsider response write must be denied by RLS");

  const removed = await migrator`
    DELETE FROM course_enrollments WHERE user_id = ${studentId}::uuid AND course_id = ${courseId}
    RETURNING user_id
  `;
  assert.equal(removed.length, 1, "student enrollment must exist");
  try {
    assert.equal(await visibleResponseCount(studentId), 0, "revoked student must not see the saved answer");
  } finally {
    await migrator`
      INSERT INTO course_enrollments (user_id, course_id)
      VALUES (${studentId}::uuid, ${courseId}) ON CONFLICT DO NOTHING
    `;
  }
  assert.equal(await visibleResponseCount(studentId), 1, "restored enrollment must restore answer access");
  console.log("RLS verified: outsider write denied; response access follows enrollment revocation and restoration");
} finally {
  await Promise.all([runtime.end(), migrator.end()]);
}
