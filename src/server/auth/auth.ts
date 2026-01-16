import "server-only";

import type { Session } from "@/domain/session";
import { User, isAdmin } from "@/domain/userTypes";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { coursePublic } from "../data/courses";
import {
  getUserById,
  getUserAccessCode as getUserAccessCodeFromStore,
  getAllUsers,
} from "../database/userStore";

const SESSION_COOKIE_NAME = "sn-session";

export type { Session } from "@/domain/session";


export async function setSessionCookie(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, userId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE_NAME)?.value;
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

/**
 * Get the access code for a user by their ID.
 * Returns null if user not found or has no credentials.
 */
export async function getUserAccessCode(userId: string): Promise<string | null> {
  return getUserAccessCodeFromStore(userId);
}

/**
 * Get all users (for admin dashboard statistics)
 */
export async function getAllUsersForStats(): Promise<User[]> {
  return getAllUsers();
}
