"use server";

import { clearSessionCookie, getSession, setSessionCookie } from "@/server/auth/auth";
import type { DefaultUser, User } from "@/domain/userTypes";
import type { Session } from "@/domain/session";
import { isAdmin } from "@/domain/userTypes";
import {
  authenticateUser,
  createUser,
  addCourseToUser,
  getUserById,
  generateAccessCode,
} from "@/server/database/userStore";

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
   * Optional: current logged-in user ID (from your client).
   * Used to check if user is already logged in.
   */
  currentUserId?: string | null;
};

export type ContinueAccessResult =
  | { ok: true; redirectTo: string; session: Session; accessCode?: string }
  | { ok: false; error: string; redirectTo?: string };

// -----------------------------
// Helper functions (domain logic)
// -----------------------------

function isNonEmpty(s: string) {
  return s.trim().length > 0;
}

function hasCourseAccess(user: User, groupKey: string, courseId: string): boolean {
  if (isAdmin(user)) return true;
  if (user.role !== "user") return false; // Only default users have groupKey and courseIds
  if (user.groupKey !== groupKey) return false;
  return user.courseIds.includes(courseId);
}

async function buildSuccessResult(
  user: User,
  redirectTo: string,
  accessCode?: string
): Promise<ContinueAccessResult> {
  await setSessionCookie(user.id);
  return { ok: true, redirectTo, session: { user }, accessCode };
}

/**
 * Enroll a user in a course, respecting group and admin rules.
 * Returns true on success (user has the course afterwards), false otherwise.
 */
async function enrollUserInCourse(
  user: User,
  groupKey: string,
  courseId: string
): Promise<boolean> {
  if (isAdmin(user)) return true;
  if (user.role !== "user") return false; // Only default users can be enrolled
  if (user.groupKey !== groupKey) return false;

  // Add course to user
  await addCourseToUser(user.id, courseId);

  return true;
}

type CreateUserResult = {
  user: User;
  accessCode: string;
};

/**
 * Create a new user with the given PIN.
 * PIN is a password, not a unique identifier - multiple users can have the same PIN.
 * Each user is identified by their unique access code.
 */
async function createNewUser(pin: string, groupKey: string): Promise<CreateUserResult> {
  const userId = `u${Date.now().toString(36)}`;
  const accessCode = generateAccessCode();
  const newUser: DefaultUser = {
    id: userId,
    role: "user",
    groupKey,
    courseIds: [],
  };

  await createUser(newUser, pin, accessCode);

  return { user: newUser, accessCode };
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

  const session = await getSession();
  const currentUser = session?.user ?? (currentUserId ? await getUserById(currentUserId) : null);
  const isLoggedIn = !!currentUser;

  if (!hasAccessCode && !hasPin) {
    return { ok: false, error: "Please enter your credentials." };
  }

  // --------- NORMAL LOGIN (NO COURSE JOIN) ----------
  if (!ctx.isCourseJoin) {
    if (!hasAccessCode || !hasPin) {
      return { ok: false, error: "Invalid credentials." };
    }

    const authenticatedUser = await authenticateUser(accessCode, pin);
    if (!authenticatedUser) {
      return { ok: false, error: "Invalid credentials." };
    }

    return buildSuccessResult(authenticatedUser, "/");
  }

  // --------- COURSE JOIN MODE ----------
  if (!ctx.courseId || !ctx.courseRoute || !ctx.groupKey) {
    return { ok: false, error: "Invalid course link." };
  }

  const groupKey = ctx.groupKey;
  const courseId = ctx.courseId;
  const courseRoute = ctx.courseRoute;

  // Helper to centralize course-join logic
  const handleCourseJoin = async (
    user: User,
    newAccessCode?: string
  ): Promise<ContinueAccessResult> => {
    if (hasCourseAccess(user, groupKey, courseId)) {
      return buildSuccessResult(user, courseRoute, newAccessCode);
    }

    if (!ctx.isRegistrationOpen) {
      return {
        ok: false,
        error: "Registration window not open.",
        redirectTo: "/",
      };
    }

    const enrolled = await enrollUserInCourse(user, groupKey, courseId);
    if (!enrolled) {
      return {
        ok: false,
        error: "Failed to enroll in course.",
        redirectTo: "/",
      };
    }

    // Reload user to get updated courseIds
    const updatedUser = await getUserById(user.id);
    if (!updatedUser) {
      return {
        ok: false,
        error: "Failed to load user data.",
        redirectTo: "/",
      };
    }

    return buildSuccessResult(updatedUser, courseRoute, newAccessCode);
  };

  // Already logged in AND already has access → go straight to course
  if (isLoggedIn && currentUser && hasCourseAccess(currentUser, groupKey, courseId)) {
    return buildSuccessResult(currentUser, courseRoute);
  }

  // Already logged in but no access yet → must re-enter credentials
  if (isLoggedIn) {
    if (!hasAccessCode || !hasPin) {
      return { ok: false, error: "Invalid credentials." };
    }

    const authenticatedUser = await authenticateUser(accessCode, pin);
    if (!authenticatedUser) {
      return { ok: false, error: "Invalid credentials." };
    }

    return handleCourseJoin(authenticatedUser);
  }

  // Not logged in, course join mode

  // Case: accessCode + pin → login + join attempt
  if (hasAccessCode) {
    if (!hasPin) {
      return { ok: false, error: "Invalid credentials." };
    }

    const authenticatedUser = await authenticateUser(accessCode, pin);
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

  const { user: newUser, accessCode: newAccessCode } = await createNewUser(pin, groupKey);
  return handleCourseJoin(newUser, newAccessCode);
}

export async function signOutAction(): Promise<void> {
  await clearSessionCookie();
}
