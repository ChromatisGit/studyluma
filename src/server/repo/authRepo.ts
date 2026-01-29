import "server-only";

import type { BucketType, BucketState } from "./types";

/**
 * Auth repository facade for rate-limiting buckets.
 *
 * In development, uses an in-memory implementation for fast iteration without
 * a database. In production, delegates to the real database implementation.
 */
const impl =
  process.env.NODE_ENV === "production"
    ? await import("../db/authRepo")
    : await import("../dev/authRepo");

export async function getBucket(
  type: BucketType,
  ip: string,
  accessCode: string | null
): Promise<BucketState | null> {
  return impl.getBucket(type, ip, accessCode);
}

export async function upsertBucket(
  state: Partial<BucketState> & {
    type: BucketType;
    ip: string;
    accessCode: string | null;
  }
): Promise<BucketState> {
  return impl.upsertBucket(state);
}

export async function recordAttempt(
  type: BucketType,
  ip: string,
  accessCode: string | null,
  success: boolean
): Promise<void> {
  return impl.recordAttempt(type, ip, accessCode, success);
}

export async function setBucketLock(
  type: BucketType,
  ip: string,
  accessCode: string | null,
  lockedUntil: Date | null
): Promise<void> {
  return impl.setBucketLock(type, ip, accessCode, lockedUntil);
}

export type { BucketType, BucketState } from "./types";
