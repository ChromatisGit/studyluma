import { verifyPin } from "@chromatis/base/auth";
import { anonSQL } from "@core/db.server.js";
import type { UserDTO } from "./types.js";

type RawAttemptResult = {
  allowed: boolean;
  reason?: "locked" | "too_many_attempts";
};

type StoredUserRow = {
  id: string;
  role: "admin" | "user";
  group_key: string | null;
  username: string;
  pin_hash: string;
  enabled: boolean;
  course_ids: string[];
};

export async function getAuthenticatedUser(
  username: string,
  pin: string,
  ip: string,
): Promise<UserDTO | null> {
  const normalizedIp = ip?.trim() || "unknown";
  const ipKey = `ip:${normalizedIp}`;
  const usernameKey = `username_ip:${username}:${normalizedIp}`;

  const checkAttempt = async (bucketKey: string, success: boolean): Promise<boolean> => {
    const rows = await anonSQL<{ check_and_record_attempt: RawAttemptResult }[]>`
      SELECT check_and_record_attempt(${bucketKey}, ${success})
    `;
    const raw = rows[0]?.check_and_record_attempt;
    if (!raw) throw new Error("check_and_record_attempt returned no result");
    return raw.allowed;
  };

  try {
    const [ipAllowed, usernameAllowed] = await Promise.all([
      checkAttempt(ipKey, false),
      checkAttempt(usernameKey, false),
    ]);
    if (!ipAllowed || !usernameAllowed) return null;

    const rows = await anonSQL<StoredUserRow[]>`
      SELECT id, role, group_key, username, pin_hash, enabled, course_ids
      FROM get_user_for_login(${username})
    `;
    const stored = rows[0];
    if (!stored || !stored.enabled) return null;

    const ok = stored ? await verifyPin(pin, stored.pin_hash) : false;

    if (ok) {
      await Promise.all([checkAttempt(ipKey, true), checkAttempt(usernameKey, true)]);
      return {
        id: stored.id,
        role: stored.role,
        groupKey: stored.group_key,
        courseIds: stored.course_ids,
      };
    }

    return null;
  } catch (error) {
    console.error("[Auth] Authentication failed:", error);
    return null;
  }
}
