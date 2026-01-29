import "server-only";

import type { User } from "@schema/userTypes";
import type { StoredUser, InsertUserInput } from "./types";

/**
 * User repository facade.
 *
 * Provides a stable API for user data access. In development, uses an in-memory
 * implementation (`dev/userRepo`) with seeded test data for fast iteration without
 * a database. In production, delegates to the real database (`db/userRepo`).
 *
 * The NODE_ENV check allows the bundler to dead-code eliminate the unused branch.
 */
const impl =
  process.env.NODE_ENV === "production"
    ? await import("../db/userRepo")
    : await import("../dev/userRepo");

export async function getUserById(userId: string): Promise<User | null> {
  return impl.getUserById(userId);
}

export async function getUserByAccessCode(
  accessCode: string
): Promise<StoredUser | null> {
  return impl.getUserByAccessCode(accessCode);
}

export async function insertUser(input: InsertUserInput): Promise<void> {
  return impl.insertUser(input);
}

export async function addCourseToUser(
  userId: string,
  courseId: string
): Promise<void> {
  return impl.addCourseToUser(userId, courseId);
}

export async function getUserAccessCode(
  userId: string
): Promise<string | null> {
  return impl.getUserAccessCode(userId);
}

export async function getUserCount(): Promise<number> {
  return impl.getUserCount();
}

export type { StoredUser, InsertUserInput } from "./types";
