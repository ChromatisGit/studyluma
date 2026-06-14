import { anonSQL } from "@core/db.server";
import type { UserDTO } from "@core/auth/types";

export type DemoRole = "student" | "teacher";

const DEMO_USERNAMES: Record<DemoRole, string> = {
  student: "demo-student",
  teacher: "demo-teacher",
};

export async function getDemoUser(role: DemoRole): Promise<UserDTO | null> {
  const username = DEMO_USERNAMES[role];
  const rows = await anonSQL<{
    id: string;
    role: "admin" | "user";
    group_key: string | null;
    course_ids: string[];
  }[]>`
    SELECT id, role, group_key, course_ids FROM get_user_for_login(${username})
  `;
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, role: row.role, groupKey: row.group_key, courseIds: row.course_ids };
}

export function demoRoleFromUser(user: UserDTO): DemoRole {
  return user.role === "admin" ? "teacher" : "student";
}
