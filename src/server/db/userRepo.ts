import "server-only";

import { query, transaction } from ".";
import type { UserRow } from "./types";
import type { User } from "@schema/userTypes";
import type { InsertUserInput, StoredUser } from "@repo/types";

export async function getUserById(userId: string): Promise<User | null> {
  const rows = await query<UserRow>`
    SELECT id, role, group_key, access_code, pin_hash
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  if (row.role === "admin") {
    return { id: row.id, role: "admin" };
  }

  if (!row.group_key) return null;

  const courseRows = await query<{ course_id: string }>`
    SELECT course_id
    FROM user_courses
    WHERE user_id = ${row.id}
  `;

  return {
    id: row.id,
    role: "user",
    groupKey: row.group_key,
    courseIds: courseRows.map((course) => course.course_id),
  };
}

export async function getUserByAccessCode(accessCode: string): Promise<StoredUser | null> {
  const rows = await query<UserRow>`
    SELECT id, role, group_key, access_code, pin_hash
    FROM users
    WHERE access_code = ${accessCode}
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;

  if (row.role === "admin") {
    return {
      user: { id: row.id, role: "admin" },
      credentials: {
        accessCode: row.access_code,
        pinHash: row.pin_hash,
      },
    };
  }

  if (!row.group_key) return null;

  const courseRows = await query<{ course_id: string }>`
    SELECT course_id
    FROM user_courses
    WHERE user_id = ${row.id}
  `;

  return {
    user: {
      id: row.id,
      role: "user",
      groupKey: row.group_key,
      courseIds: courseRows.map((course) => course.course_id),
    },
    credentials: {
      accessCode: row.access_code,
      pinHash: row.pin_hash,
    },
  };
}

/**
 * Create user in a transaction, including user_courses for DefaultUser.
 */
export async function insertUser(input: InsertUserInput): Promise<void> {
  const groupKey = input.user.role === "user" ? input.user.groupKey : null;
  const courseIds = input.user.role === "user" ? input.user.courseIds : [];

  await transaction(async (tx) => {
    await tx.query`
      INSERT INTO users (id, role, group_key, access_code, pin_hash)
      VALUES (${input.user.id}, ${input.user.role}, ${groupKey}, ${input.accessCode}, ${input.pinHash})
    `;

    for (const courseId of courseIds) {
      await tx.query`
        INSERT INTO user_courses (user_id, course_id)
        VALUES (${input.user.id}, ${courseId})
      `;
    }
  });
}

export async function addCourseToUser(userId: string, courseId: string): Promise<void> {
  await query`
    INSERT INTO user_courses (user_id, course_id)
    VALUES (${userId}, ${courseId})
    ON CONFLICT DO NOTHING
  `;
}

export async function getUserAccessCode(userId: string): Promise<string | null> {
  const rows = await query<{ access_code: string }>`
    SELECT access_code
    FROM users
    WHERE id = ${userId}
    LIMIT 1
  `;
  return rows[0]?.access_code ?? null;
}

export async function getUserCount(): Promise<number> {
  const rows = await query<{ count: string }>`
    SELECT count(*) as count
    FROM users
    WHERE role = 'user'
  `;
  return Number(rows[0]?.count ?? 0);
}
