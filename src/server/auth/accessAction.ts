"use server";

import { MOCK_CREDENTIALS, MOCK_USERS } from "@auth/auth";
import type { DefaultUser, User } from "@domain/userTypes";
import type { Session } from "@domain/session";
import { isAdmin } from "@domain/userTypes";

// -----------------------------
// Types
// -----------------------------

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

  /**
   * Optional: current logged-in user ID (from your client mock).
   * When you later move to real auth, this can be ignored
   * and replaced by reading from the server-side session.
   */
  currentUserId?: string | null;
};

export type ContinueAccessResult =
  | { ok: true; redirectTo: string; session: Session }
  | { ok: false; error: string; redirectTo?: string };

// -----------------------------
// Helper functions (domain logic)
// -----------------------------

function isNonEmpty(s: string) {
  return s.trim().length > 0;
}

function hasCourseAccess(user: User, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.groupKey !== groupKey) return false;
  return user.courseIds.includes(courseId);
}

function findUserIdByCredentials(accessCode: string, pin: string): string | null {
  for (const [userId, credentials] of Object.entries(MOCK_CREDENTIALS)) {
    if (credentials.accessCode === accessCode && credentials.pin === pin) return userId;
  }
  return null;
}

function findUserIdByPin(pin: string): string | null {
  for (const [userId, credentials] of Object.entries(MOCK_CREDENTIALS)) {
    if (credentials.pin === pin) return userId;
  }
  return null;
}

function resolveUserFromCredentials(accessCode: string, pin: string): User | null {
  const userId = findUserIdByCredentials(accessCode, pin);
  if (!userId) return null;
  return MOCK_USERS[userId] ?? null;
}

function generateAccessCode(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

/**
 * Enroll a user in a course, respecting group and admin rules.
 * Returns true on success (user has the course afterwards), false otherwise.
 */
function enrollUserInCourse(user: User, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.groupKey !== groupKey) return false;
  if (!user.courseIds.includes(courseId)) user.courseIds.push(courseId);
  return true;
}

/**
 * Find an existing user by PIN or create a new one.
 * Does NOT enroll the user into the course; that is handled by handleCourseJoin.
 */
function resolveOrCreateUserByPin(
  pin: string,
  groupKey: string
): User {
  const existingUserId = findUserIdByPin(pin);
  if (existingUserId) {
    const existingUser = MOCK_USERS[existingUserId];
    if (existingUser) {
      return existingUser;
    }
  }

  const userId = `u${Date.now().toString(36)}`;
  const accessCode = generateAccessCode();
  const newUser: DefaultUser = {
    id: userId,
    role: "user",
    groupKey,
    courseIds: [],
  };

  MOCK_USERS[userId] = newUser;
  MOCK_CREDENTIALS[userId] = { accessCode, pin };
  return newUser;
}

// -----------------------------
// Server action
// -----------------------------

export async function continueAccessAction(
  input: ContinueAccessInput
): Promise<ContinueAccessResult> {
  const { accessCode, pin, ctx, currentUserId } = input;

  const hasAccessCode = isNonEmpty(accessCode);
  const hasPin = isNonEmpty(pin);

  const currentUser = currentUserId ? (MOCK_USERS[currentUserId] ?? null) : null;
  const isLoggedIn = !!currentUser;

  if (!hasAccessCode && !hasPin) {
    return { ok: false, error: "Please enter your credentials." };
  }

  // --------- NORMAL LOGIN (NO COURSE JOIN) ----------
  if (!ctx.isCourseJoin) {
    if (!hasAccessCode || !hasPin) {
      return { ok: false, error: "Invalid credentials." };
    }

    const authenticatedUser = resolveUserFromCredentials(accessCode, pin);
    if (!authenticatedUser) {
      return { ok: false, error: "Invalid credentials." };
    }

    // TODO: When moving to real auth, set the server-side session here.
    return {
      ok: true,
      redirectTo: "/",
      session: { user: authenticatedUser },
    };
  }

  // --------- COURSE JOIN MODE ----------
  if (!ctx.courseId || !ctx.courseRoute || !ctx.groupKey) {
    return { ok: false, error: "Invalid course link." };
  }

  const groupKey = ctx.groupKey;
  const courseId = ctx.courseId;
  const courseRoute = ctx.courseRoute;

  // Helper to centralize course-join logic
  const handleCourseJoin = (user: User): ContinueAccessResult => {
    if (hasCourseAccess(user, groupKey, courseId)) {
      return { ok: true, redirectTo: courseRoute, session: { user } };
    }

    if (!ctx.isRegistrationOpen) {
      return {
        ok: false,
        error: "Registration window not open.",
        redirectTo: "/",
      };
    }

    if (!enrollUserInCourse(user, groupKey, courseId)) {
      return {
        ok: false,
        error: "Registration window not open.",
        redirectTo: "/",
      };
    }

    return { ok: true, redirectTo: courseRoute, session: { user } };
  };

  // Already logged in AND already has access → go straight to course
  if (isLoggedIn && currentUser && hasCourseAccess(currentUser, groupKey, courseId)) {
    return { ok: true, redirectTo: courseRoute, session: { user: currentUser } };
  }

  // Already logged in but no access yet → must re-enter credentials
  if (isLoggedIn) {
    if (!hasAccessCode || !hasPin) {
      return { ok: false, error: "Invalid credentials." };
    }

    const authenticatedUser = resolveUserFromCredentials(accessCode, pin);
    if (!authenticatedUser) {
      return { ok: false, error: "Invalid credentials." };
    }

    // TODO: Later, ensure re-auth is wired to your real session (if needed).
    return handleCourseJoin(authenticatedUser);
  }

  // Not logged in, course join mode

  // Case: accessCode + pin → login + join attempt
  if (hasAccessCode) {
    if (!hasPin) {
      return { ok: false, error: "Invalid credentials." };
    }

    const authenticatedUser = resolveUserFromCredentials(accessCode, pin);
    if (!authenticatedUser) {
      return { ok: false, error: "Invalid credentials." };
    }

    return handleCourseJoin(authenticatedUser);
  }

  // Case: PIN only (no access code)
  if (!ctx.isRegistrationOpen) {
    return {
      ok: false,
      error: "Registration window not open.",
      redirectTo: "/",
    };
  }

  const pinUser = resolveOrCreateUserByPin(pin, groupKey);
  return handleCourseJoin(pinUser);
}
