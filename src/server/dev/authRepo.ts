import "server-only";

import type { BucketType, BucketState } from "@repo/types";

const buckets = new Map<string, BucketState>();

function bucketKey(
  type: BucketType,
  ip: string,
  accessCode: string | null
): string {
  return `${type}:${ip}:${accessCode ?? ""}`;
}

export async function getBucket(
  type: BucketType,
  ip: string,
  accessCode: string | null
): Promise<BucketState | null> {
  return buckets.get(bucketKey(type, ip, accessCode)) ?? null;
}

export async function upsertBucket(
  state: Partial<BucketState> & {
    type: BucketType;
    ip: string;
    accessCode: string | null;
  }
): Promise<BucketState> {
  const now = new Date();
  const key = bucketKey(state.type, state.ip, state.accessCode);

  const bucket: BucketState = {
    id: key,
    type: state.type,
    ip: state.ip,
    accessCode: state.accessCode,
    windowStartedAt: state.windowStartedAt ?? now,
    attemptCount: state.attemptCount ?? 0,
    lockedUntil: state.lockedUntil ?? null,
    lastAttemptAt: state.lastAttemptAt ?? now,
  };

  buckets.set(key, bucket);
  return bucket;
}

export async function recordAttempt(
  type: BucketType,
  ip: string,
  accessCode: string | null,
  success: boolean
): Promise<void> {
  const now = new Date();
  const existing = await getBucket(type, ip, accessCode);

  const attemptCount = success ? 0 : (existing?.attemptCount ?? 0) + 1;
  const windowStartedAt = success ? now : (existing?.windowStartedAt ?? now);
  const lockedUntil = success ? null : (existing?.lockedUntil ?? null);

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

export async function setBucketLock(
  type: BucketType,
  ip: string,
  accessCode: string | null,
  lockedUntil: Date | null
): Promise<void> {
  const key = bucketKey(type, ip, accessCode);
  const existing = buckets.get(key);
  if (existing) {
    existing.lockedUntil = lockedUntil;
    buckets.set(key, existing);
  }
}
