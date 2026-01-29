import "server-only";

import type { CourseState } from "./types";

/**
 * Course repository facade.
 *
 * Provides a stable API for course state access (progress, registration windows).
 * In development, uses an in-memory implementation (`dev/courseRepo`) with seeded
 * test data for fast iteration without a database. In production, delegates to
 * the real database (`db/courseRepo`).
 *
 * The NODE_ENV check allows the bundler to dead-code eliminate the unused branch.
 */
const impl =
  process.env.NODE_ENV === "production"
    ? await import("../db/courseRepo")
    : await import("../dev/courseRepo");

export async function getCourse(courseId: string): Promise<CourseState | null> {
  return impl.getCourse(courseId);
}

export async function updateCourseProgress(
  courseId: string,
  topicId: string,
  chapterId: string
): Promise<void> {
  return impl.updateCourseProgress(courseId, topicId, chapterId);
}

export async function setRegistrationOpenUntil(
  courseId: string,
  openUntil: Date | null
): Promise<void> {
  return impl.setRegistrationOpenUntil(courseId, openUntil);
}

export type { CourseState } from "./types";
