import "server-only";

import type { Session } from "@schema/session";
import { User, isAdmin } from "@schema/userTypes";
import { getBucket, upsertBucket, type BucketState } from "@repo/authRepo";
import { getUserByAccessCode } from "@repo/userRepo";
import { getCourseById } from "@providers/courseProvider";
import { verifyPin } from "@server-lib/argon2";
import { MAX_PER_CODE_IP, MAX_PER_IP, WINDOW_MS, LOCK_MS } from "@server/config/rateLimit";
import { notFound } from "next/navigation";
import { getUserById } from "./userService";
import { getSessionCookie } from "@server-lib/auth";

export type { Session } from "@schema/session";

// ============================================
// Session & Access Control
// ============================================

function coursePublic(courseId: string): boolean {
    const course = getCourseById(courseId);
    if (!course) notFound();
    return course.isPublic;
}

export async function getSession(): Promise<Session | null> {
    const userId = await getSessionCookie();
    if (!userId) return null;

    const user = await getUserById(userId);
    if (!user) return null;

    return { user };
}

export function assertLoggedIn(
    session: Session | null
): asserts session is Session {
    if (!session) {
        notFound();
    }
}

export function assertAdminAccess(
    session: Session | null
): asserts session is Session {
    if (!session || !isAdmin(session.user)) {
        notFound();
    }
}

export function assertCanAccessPage(
    session: Session | null,
    groupKey: string,
    courseId?: string
): void {
    // Check public course access first (doesn't require login)
    if (courseId && coursePublic(courseId)) {
        return;
    }

    // For non-public courses, require login
    assertLoggedIn(session);
    if (!canUserAccessPage(session.user, groupKey, courseId)) {
        notFound();
    }
}

export function canUserAccessPage(
    user: User | null,
    groupKey: string,
    courseId?: string
): boolean {
    if (user && isAdmin(user)) return true;

    if (courseId && coursePublic(courseId)) return true;

    if (!user) return false;

    if (user.role !== "user") return false; // Only default users have groupKey and courseIds

    if (user.groupKey !== groupKey) return false;

    if (courseId && !user.courseIds.includes(courseId)) return false;

    return true;
}

// ============================================
// Rate-Limited Authentication
// ============================================

function isLocked(lockedUntil: Date | null, now: Date): boolean {
    return Boolean(lockedUntil && lockedUntil.getTime() > now.getTime());
}

function normalizeBucket(bucket: BucketState | null, now: Date) {
    if (!bucket) {
        return { attemptCount: 0, windowStartedAt: now, lockedUntil: null };
    }

    const lockExpired = bucket.lockedUntil && bucket.lockedUntil.getTime() <= now.getTime();
    const windowExpired =
        lockExpired || now.getTime() - bucket.windowStartedAt.getTime() >= WINDOW_MS;

    return {
        attemptCount: windowExpired ? 0 : bucket.attemptCount,
        windowStartedAt: windowExpired ? now : bucket.windowStartedAt,
        lockedUntil: lockExpired ? null : bucket.lockedUntil,
    };
}

async function applyAttempt(options: {
    type: "ip" | "access_code_ip";
    ip: string;
    accessCode: string | null;
    bucket: BucketState | null;
    maxAttempts: number;
    now: Date;
    success: boolean;
}): Promise<void> {
    const { type, ip, accessCode, bucket, maxAttempts, now, success } = options;
    const normalized = normalizeBucket(bucket, now);

    const attemptCount = success ? 0 : normalized.attemptCount + 1;
    const windowStartedAt = success ? now : normalized.windowStartedAt;
    const lockedUntil = success
        ? null
        : attemptCount >= maxAttempts
            ? new Date(now.getTime() + LOCK_MS)
            : normalized.lockedUntil;

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

/**
 * DB downtime must fail closed => return null.
 * Errors to client must be generic; return null on any auth error.
 */
export async function getAuthenticatedUser(accessCode: string, pin: string, ip: string): Promise<User | null> {
    const now = new Date();
    const normalizedIp = ip?.trim() || "unknown";

    try {
        const [ipBucket, codeBucket] = await Promise.all([
            getBucket("ip", normalizedIp, null),
            getBucket("access_code_ip", normalizedIp, accessCode),
        ]);

        if (isLocked(ipBucket?.lockedUntil ?? null, now) || isLocked(codeBucket?.lockedUntil ?? null, now)) {
            return null;
        }

        const stored = await getUserByAccessCode(accessCode);
        const ok = stored
            ? await verifyPin(pin, stored.credentials.pinHash)
            : false;

        await Promise.all([
            applyAttempt({
                type: "ip",
                ip: normalizedIp,
                accessCode: null,
                bucket: ipBucket,
                maxAttempts: MAX_PER_IP,
                now,
                success: ok,
            }),
            applyAttempt({
                type: "access_code_ip",
                ip: normalizedIp,
                accessCode,
                bucket: codeBucket,
                maxAttempts: MAX_PER_CODE_IP,
                now,
                success: ok,
            }),
        ]);

        return ok ? stored!.user : null;
    } catch (error) {
        console.error("[Auth] Authentication failed:", error);
        return null;
    }
}
