"use server";

import { redirect } from "next/navigation";
import { clearSessionCookie, setSessionCookie } from "@server-lib/auth";
import { getSession, isAdmin, assertLoggedIn } from "@services/authService";
import { addCourseToUser, createUser, getUserById } from "@services/userService";
import { getAuthenticatedUser } from "@services/authService";
import { isRegistrationOpen, getCourseDTO, getCourseSlug } from "@services/courseService";
import { getActiveQuizForUser } from "@services/quizService";
import { getClientIp } from "@server-lib/getClientIp";
import type { UserDTO } from "@services/userService";

export type AccessContext = {
  isCourseJoin: boolean;
  groupKey: string | null;
  courseId: string | null;
  courseRoute: string | null;
  isRegistrationOpen: boolean;
  /** Internal path to redirect to after login/registration (already sanitised by the server page). */
  from: string | null;
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

async function success(
  user: UserDTO,
  redirectTo: string,
  accessCode?: string,
): Promise<ContinueAccessResult> {
  await setSessionCookie(user.id);
  return { ok: true, redirectTo, accessCode };
}

function hasCourseAccess(user: UserDTO, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.role !== "user") return false;
  return user.groupKey === groupKey && user.courseIds.includes(courseId);
}

async function ensureCourseAccess(
  user: UserDTO,
  groupKey: string,
  courseId: string,
  ip: string,
): Promise<UserDTO | null> {
  if (hasCourseAccess(user, groupKey, courseId)) return user;

  if (isAdmin(user)) return user;
  if (user.role !== "user") return null;
  if (user.groupKey !== groupKey) return null;

  await addCourseToUser(user, courseId, ip);
  return getUserById(user.id);
}

// -----------------------------
// Main action
// -----------------------------

export async function continueAccessAction(
  input: ContinueAccessInput,
): Promise<ContinueAccessResult> {
  const { accessCode, pin, ctx } = input;

  const hasCode = isNonEmpty(accessCode);
  const hasPin = isNonEmpty(pin);

  if (!hasCode && !hasPin) return fail("Please enter your credentials.");

  const courseCtx =
    ctx.isCourseJoin && ctx.groupKey && ctx.courseId && ctx.courseRoute
      ? { groupKey: ctx.groupKey, courseId: ctx.courseId, courseRoute: ctx.courseRoute }
      : null;

  if (ctx.isCourseJoin && !courseCtx) return fail("Invalid course link.");

  const mode: "normal" | "course-auth" | "course-pin" =
    !ctx.isCourseJoin ? "normal" : hasCode ? "course-auth" : "course-pin";

  const ip = await getClientIp();

  // -------- normal login --------
  if (mode === "normal") {
    if (!hasCode || !hasPin) return invalidCreds();

    const user = await getAuthenticatedUser(accessCode, pin, ip);
    if (!user) return invalidCreds();

    const [activeQuiz, primaryCourseSlug] = await Promise.all([
      getActiveQuizForUser(user),
      user.courseIds.length > 0 ? getCourseSlug(user.courseIds[0]) : Promise.resolve(null),
    ]);
    return success(user, activeQuiz ? "/quiz" : (ctx.from ?? primaryCourseSlug ?? "/practice"));
  }

  // from here: course join mode
  const { groupKey, courseId, courseRoute } = courseCtx!;
  const registrationOpen = await isRegistrationOpen(courseId);

  const session = await getSession();
  const currentUser = session?.user ?? null;

  if (currentUser && hasCourseAccess(currentUser, groupKey, courseId)) {
    return success(currentUser, ctx.from ?? courseRoute);
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

    return success(updated, ctx.from ?? courseRoute);
  }

  // -------- course join with pin only (create user) --------
  if (!registrationOpen) return registrationClosed();

  const { user: newUser, accessCode: newAccessCode } = await createUser(pin, groupKey, ip);

  const updated = await ensureCourseAccess(newUser, groupKey, courseId, ip);
  if (!updated) return fail("Failed to enroll in course.", "/");

  return success(updated, ctx.from ?? courseRoute, newAccessCode);
}

export async function joinCourseAction(courseId: string): Promise<void> {
  const session = await getSession();
  assertLoggedIn(session);

  const open = await isRegistrationOpen(courseId);
  if (!open) return; // silently bail — UI should only show open courses

  const ip = await getClientIp();
  await addCourseToUser(session.user, courseId, ip);

  const course = await getCourseDTO(courseId);
  redirect(course.slug);
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
}
