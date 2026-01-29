import "server-only";

import type { AuditEntry } from "./types";

/**
 * Audit repository facade for logging security-relevant actions.
 *
 * Unlike userRepo and courseRepo, this module always uses the database implementation
 * even in development mode. Audit logs are compliance-critical and must be persisted
 * to durable storage. An in-memory mock would prevent testing of audit trail
 * completeness and could mask issues with log formatting or DB constraints.
 */
const impl = await import("../db/auditRepo");

export async function insertAuditLog(entry: AuditEntry): Promise<void> {
  return impl.insertAuditLog(entry);
}

export type { AuditAction, AuditEntry } from "./types";
