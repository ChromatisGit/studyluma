import "server-only";

import { query } from ".";
import type { AuthAttemptRow } from "./types";
import type { BucketState, BucketType } from "@repo/types";

const EMPTY_ACCESS_CODE = "";

function normalizeAccessCode(accessCode: string | null): string {
  return accessCode ?? EMPTY_ACCESS_CODE;
}

function toBucketState(row: AuthAttemptRow): BucketState {
  const accessCode = row.access_code === EMPTY_ACCESS_CODE ? null : row.access_code;
  return {
    id: `${row.bucket_type}:${row.ip}:${accessCode ?? ""}`,
    type: row.bucket_type,
    ip: row.ip,
    accessCode,
    windowStartedAt: row.window_start,
    attemptCount: row.attempt_count,
    lockedUntil: row.locked_until,
    lastAttemptAt: row.last_attempt_at,
  };
}

export async function getBucket(type: BucketType, ip: string, accessCode: string | null): Promise<BucketState | null> {
  const accessCodeValue = normalizeAccessCode(accessCode);

  // For null accessCode, we need to check both empty string and NULL
  const rows = accessCode === null
    ? await query<AuthAttemptRow>`
        SELECT bucket_type, ip, access_code, window_start, last_attempt_at, attempt_count, locked_until, updated_at
        FROM auth_attempts
        WHERE bucket_type = ${type}
          AND ip = ${ip}
          AND (access_code = ${accessCodeValue} OR access_code IS NULL)
        LIMIT 1
      `
    : await query<AuthAttemptRow>`
        SELECT bucket_type, ip, access_code, window_start, last_attempt_at, attempt_count, locked_until, updated_at
        FROM auth_attempts
        WHERE bucket_type = ${type}
          AND ip = ${ip}
          AND access_code = ${accessCodeValue}
        LIMIT 1
      `;

  const row = rows[0];
  return row ? toBucketState(row) : null;
}

export async function upsertBucket(state: Partial<BucketState> & { type: BucketType; ip: string; accessCode: string | null }): Promise<BucketState> {
  const now = new Date();
  const accessCodeValue = normalizeAccessCode(state.accessCode);
  const windowStartedAt = state.windowStartedAt ?? now;
  const lastAttemptAt = state.lastAttemptAt ?? now;
  const attemptCount = state.attemptCount ?? 0;
  const lockedUntil = state.lockedUntil ?? null;

  await query`
    INSERT INTO auth_attempts (bucket_type, ip, access_code, window_start, last_attempt_at, attempt_count, locked_until, updated_at)
    VALUES (${state.type}, ${state.ip}, ${accessCodeValue}, ${windowStartedAt}, ${lastAttemptAt}, ${attemptCount}, ${lockedUntil}, ${now})
    ON CONFLICT (bucket_type, ip, access_code) DO UPDATE SET
      window_start = ${windowStartedAt},
      last_attempt_at = ${lastAttemptAt},
      attempt_count = ${attemptCount},
      locked_until = ${lockedUntil},
      updated_at = ${now}
  `;

  return {
    id: `${state.type}:${state.ip}:${accessCodeValue}`,
    type: state.type,
    ip: state.ip,
    accessCode: state.accessCode,
    windowStartedAt,
    attemptCount,
    lockedUntil,
    lastAttemptAt,
  };
}

export async function recordAttempt(type: BucketType, ip: string, accessCode: string | null, success: boolean): Promise<void> {
  const now = new Date();
  const existing = await getBucket(type, ip, accessCode);

  const attemptCount = success ? 0 : (existing?.attemptCount ?? 0) + 1;
  const windowStartedAt = success ? now : existing?.windowStartedAt ?? now;
  const lockedUntil = success ? null : existing?.lockedUntil ?? null;

  await upsertBucket({
    type,
    ip,
    accessCode,
    attemptCount,
    windowStartedAt,
    lockedUntil,
    lastAttemptAt: now,
  });
}

export async function setBucketLock(type: BucketType, ip: string, accessCode: string | null, lockedUntil: Date | null): Promise<void> {
  const accessCodeValue = normalizeAccessCode(accessCode);
  const now = new Date();

  await query`
    UPDATE auth_attempts
    SET locked_until = ${lockedUntil}, updated_at = ${now}
    WHERE bucket_type = ${type}
      AND ip = ${ip}
      AND access_code = ${accessCodeValue}
  `;
}
