import "server-only";

import { anonSQL, userSQL } from "@db/runSQL";
import { hashPin } from "@server-lib/argon2";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserDTO = {
  id: string;
  role: "admin" | "user";
  groupKey: string | null;
  courseIds: string[];
};

// ---------------------------------------------------------------------------
// User creation
// ---------------------------------------------------------------------------

/**
 * Creates a new student user.
 * create_user_with_code is SECURITY DEFINER — generates a unique access code and
 * inserts the user atomically in one SQL call.
 */
export async function createUser(
  pin: string,
  groupKey: string,
  ip: string,
): Promise<{ user: UserDTO; accessCode: string }> {
  const userId = `u${Date.now().toString(36)}`;
  const pinHash = await hashPin(pin);

  const rows = await anonSQL<{ create_user_with_code: string }[]>`
    SELECT create_user_with_code(${userId}, ${pinHash}, ${groupKey})
  `;
  const accessCode = rows[0]?.create_user_with_code;
  if (!accessCode) throw new Error("Failed to create user account");

  const user: UserDTO = { id: userId, role: "user", groupKey, courseIds: [] };

  try {
    await anonSQL`
      INSERT INTO log_audit (user_id, event_type, ip_address, user_agent, metadata)
      VALUES (${userId}, ${"createUser"}, ${ip ?? null}, ${null}, ${null})
    `;
  } catch (e) {
    console.error("[Audit] Failed to log createUser:", e);
  }

  return { user, accessCode };
}

// ---------------------------------------------------------------------------
// Course enrollment (admin action)
// ---------------------------------------------------------------------------

export async function addCourseToUser(
  user: UserDTO,
  courseId: string,
  ip: string,
): Promise<void> {
  // enroll_user_in_course is SECURITY DEFINER — bypasses RLS
  await userSQL(user)`SELECT enroll_user_in_course(${user.id}, ${courseId})`;

  try {
    await anonSQL`
      INSERT INTO log_audit (user_id, event_type, ip_address, user_agent, metadata)
      VALUES (
        ${user.id},
        ${"addCourseToUser"},
        ${ip ?? null},
        ${null},
        ${JSON.stringify({ courseId })}
      )
    `;
  } catch (e) {
    console.error("[Audit] Failed to log addCourseToUser:", e);
  }
}

// ---------------------------------------------------------------------------
// User reads
// ---------------------------------------------------------------------------

/**
 * Session bootstrap: reads user by ID via SECURITY DEFINER (bypasses RLS).
 */
export async function getUserById(userId: string): Promise<UserDTO | null> {
  const rows = await anonSQL<{
    id: string;
    role: "admin" | "user";
    group_key: string | null;
    course_ids: string[];
  }[]>`SELECT id, role, group_key, course_ids FROM get_session_user(${userId})`;

  const row = rows[0];
  if (!row) return null;
  return { id: row.id, role: row.role, groupKey: row.group_key, courseIds: row.course_ids };
}

/**
 * Returns the access code for a user (for sidebar display).
 * get_user_access_code is SECURITY DEFINER — bypasses RLS.
 */
export async function getUserAccessCodeById(userId: string): Promise<string | null> {
  const rows = await anonSQL<{ get_user_access_code: string | null }[]>`
    SELECT get_user_access_code(${userId})
  `;
  return rows[0]?.get_user_access_code ?? null;
}

export async function getUserCount(): Promise<number> {
  const rows = await anonSQL<{ count: string }[]>`
    SELECT COUNT(*) AS count FROM users WHERE role = 'user'
  `;
  return Number(rows[0]?.count ?? 0);
}
