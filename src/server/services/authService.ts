import "server-only";

import { notFound } from "next/navigation";
import { anonSQL } from "@db/runSQL";
import { verifyPin } from "@server-lib/argon2";
import { getSessionCookie } from "@server-lib/auth";
import { getUserById } from "@services/userService";
import type { UserDTO } from "@services/userService";

// ---------------------------------------------------------------------------
// Session types
// ---------------------------------------------------------------------------

export type Session = { user: UserDTO };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function isAdmin(user: UserDTO): boolean {
  return user.role === "admin";
}

// ---------------------------------------------------------------------------
// Session & Access Control
// ---------------------------------------------------------------------------

export async function getSession(): Promise<Session | null> {
  const userId = await getSessionCookie();
  if (!userId) return null;

  const user = await getUserById(userId);
  if (!user) return null;

  return { user };
}

export function assertLoggedIn(session: Session | null): asserts session is Session {
  if (!session) notFound();
}

export function assertAdminAccess(session: Session | null): asserts session is Session {
  if (!session || !isAdmin(session.user)) notFound();
}

/**
 * courseIsPublic must be determined by the caller (from courseService or DB).
 */
export function assertCanAccessPage(
  session: Session | null,
  groupKey: string,
  courseIsPublic: boolean,
  courseId?: string,
): void {
  if (courseIsPublic) return;
  assertLoggedIn(session);
  if (!canUserAccessPage(session.user, groupKey, courseIsPublic, courseId)) {
    notFound();
  }
}

export function canUserAccessPage(
  user: UserDTO | null,
  groupKey: string,
  courseIsPublic: boolean,
  courseId?: string,
): boolean {
  if (courseIsPublic) return true;
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (user.role !== "user") return false;
  if (user.groupKey !== groupKey) return false;
  if (courseId && !user.courseIds.includes(courseId)) return false;
  return true;
}

// ---------------------------------------------------------------------------
// Rate-Limited Authentication (SQL function handles all rate limit logic)
// ---------------------------------------------------------------------------

type RawAttemptResult = {
  allowed: boolean;
  reason?: "locked" | "too_many_attempts";
  locked_until?: string;
  attempts?: number;
};

type StoredUserRow = {
  id: string;
  role: "admin" | "user";
  group_key: string | null;
  access_code: string;
  pin_hash: string;
  course_ids: string[];
};

/**
 * Authenticates a user by access code + PIN with SQL-based rate limiting.
 * Fails closed: returns null on any error.
 */
export async function getAuthenticatedUser(
  accessCode: string,
  pin: string,
  ip: string,
): Promise<UserDTO | null> {
  const normalizedIp = ip?.trim() || "unknown";
  const ipKey = `ip:${normalizedIp}`;
  const codeKey = `code_ip:${accessCode}:${normalizedIp}`;

  const checkAttempt = async (bucketKey: string, success: boolean): Promise<boolean> => {
    const rows = await anonSQL<{ check_and_record_attempt: RawAttemptResult }[]>`
      SELECT check_and_record_attempt(${bucketKey}, ${success})
    `;
    const raw = rows[0]?.check_and_record_attempt;
    if (!raw) throw new Error("check_and_record_attempt returned no result");
    return raw.allowed;
  };

  try {
    // Check rate limits for both buckets (record a failed attempt)
    const [ipAllowed, codeAllowed] = await Promise.all([
      checkAttempt(ipKey, false),
      checkAttempt(codeKey, false),
    ]);
    if (!ipAllowed || !codeAllowed) return null;

    // Look up user credentials (get_user_for_login is SECURITY DEFINER — bypasses RLS)
    const rows = await anonSQL<StoredUserRow[]>`
      SELECT id, role, group_key, access_code, pin_hash, course_ids
      FROM get_user_for_login(${accessCode})
    `;
    const stored = rows[0];
    const ok = stored ? await verifyPin(pin, stored.pin_hash) : false;

    if (ok) {
      // Clear rate limit buckets on success
      await Promise.all([checkAttempt(ipKey, true), checkAttempt(codeKey, true)]);
      return {
        id: stored!.id,
        role: stored!.role,
        groupKey: stored!.group_key,
        courseIds: stored!.course_ids,
      };
    }

    return null;
  } catch (error) {
    console.error("[Auth] Authentication failed:", error);
    return null;
  }
}
