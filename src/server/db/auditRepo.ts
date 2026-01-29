import "server-only";

import { query } from ".";
import type { AuditEntry } from "@repo/types";

export async function insertAuditLog(entry: AuditEntry): Promise<void> {
  await query`
    INSERT INTO audit_log (ip, user_id, action, course_id)
    VALUES (${entry.ip}, ${entry.userId}, ${entry.action}, ${entry.courseId ?? null})
  `;
}
