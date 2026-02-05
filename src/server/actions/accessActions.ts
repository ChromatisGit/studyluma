"use server";

import { clearSessionCookie, setSessionCookie } from "@server-lib/auth";
import { getSession } from "@services/authService";
import type { User } from "@schema/userTypes";
import { isAdmin } from "@schema/userTypes";
import { addCourseToUser, createUser, getUserById } from "@services/userService";
import { getAuthenticatedUser } from "@services/authService";
import { isRegistrationOpen } from "@services/courseStateService";
import { getClientIp } from "@server-lib/getClientIp";

export type AccessContext = {
  isCourseJoin: boolean;
  groupKey: string | null;
  courseId: string | null;
  courseRoute: string | null;
  isRegistrationOpen: boolean;
};

export type ContinueAccessInput = {
  accessCode: string;
  pin: string;
  ctx: AccessContext;
};

export type ContinueAccessResult =
  | { ok: true; redirectTo: string; accessCode?: string }
  | { ok: false; error: string; redirectTo?: string };

// -----------------------------
// Small helpers
// -----------------------------

const isNonEmpty = (s: string) => s.trim().length > 0;

const fail = (error: string, redirectTo?: string): ContinueAccessResult => ({
  ok: false,
  error,
  ...(redirectTo ? { redirectTo } : {}),
});

const invalidCreds = () => fail("Invalid credentials.");
const registrationClosed = () => fail("Registration window not open.", "/");

async function success(user: User, redirectTo: string, accessCode?: string): Promise<ContinueAccessResult> {
  await setSessionCookie(user.id);
  return { ok: true, redirectTo, accessCode };
}

function hasCourseAccess(user: User, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.role !== "user") return false;
  return user.groupKey === groupKey && user.courseIds.includes(courseId);
}

async function ensureCourseAccess(user: User, groupKey: string, courseId: string, ip: string): Promise<User | null> {
  if (hasCourseAccess(user, groupKey, courseId)) return user;

  // enroll only normal users with matching groupKey
  if (isAdmin(user)) return user;
  if (user.role !== "user") return null;
  if (user.groupKey !== groupKey) return null;

  await addCourseToUser(user.id, courseId, ip);
  return getUserById(user.id);
}

// -----------------------------
// Main action
// -----------------------------

export async function continueAccessAction(
  input: ContinueAccessInput
): Promise<ContinueAccessResult> {
  const { accessCode, pin, ctx } = input;

  const hasCode = isNonEmpty(accessCode);
  const hasPin = isNonEmpty(pin);

  if (!hasCode && !hasPin) return fail("Please enter your credentials.");

  // resolve course ctx if needed
  const courseCtx =
    ctx.isCourseJoin && ctx.groupKey && ctx.courseId && ctx.courseRoute
      ? { groupKey: ctx.groupKey, courseId: ctx.courseId, courseRoute: ctx.courseRoute }
      : null;

  if (ctx.isCourseJoin && !courseCtx) return fail("Invalid course link.");

  // determine mode
  const mode: "normal" | "course-auth" | "course-pin" =
    !ctx.isCourseJoin ? "normal" : hasCode ? "course-auth" : "course-pin";

  const ip = await getClientIp();

  // -------- normal login --------
  if (mode === "normal") {
    if (!hasCode || !hasPin) return invalidCreds();

    const user = await getAuthenticatedUser(accessCode, pin, ip);
    if (!user) return invalidCreds();

    return success(user, "/");
  }

  // from here: course join mode
  const { groupKey, courseId, courseRoute } = courseCtx!;
  const registrationOpen = await isRegistrationOpen(courseId);

  // quick pass: already logged in + already has access => go
  const session = await getSession();
  const currentUser = session?.user ?? null;

  if (currentUser && hasCourseAccess(currentUser, groupKey, courseId)) {
    return success(currentUser, courseRoute);
  }

  // -------- course join with auth (code + pin) --------
  if (mode === "course-auth") {
    if (!hasPin) return invalidCreds();

    const user = await getAuthenticatedUser(accessCode, pin, ip);
    if (!user) return invalidCreds();

    if (!registrationOpen && !hasCourseAccess(user, groupKey, courseId)) {
      return registrationClosed();
    }

    const updated = await ensureCourseAccess(user, groupKey, courseId, ip);
    if (!updated) return fail("Failed to enroll in course.", "/");

    return success(updated, courseRoute);
  }

  // -------- course join with pin only (create user) --------
  if (!registrationOpen) return registrationClosed();

  const { user: newUser, accessCode: newAccessCode } = await createUser(pin, groupKey, ip);

  const updated = await ensureCourseAccess(newUser, groupKey, courseId, ip);
  if (!updated) return fail("Failed to enroll in course.", "/");

  return success(updated, courseRoute, newAccessCode);
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
}
