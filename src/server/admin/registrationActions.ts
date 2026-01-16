"use server";

import { getSession } from "@/server/auth/auth";
import { isAdmin } from "@/domain/userTypes";
import {
  openRegistration,
  closeRegistration,
  isRegistrationOpen,
  getRegistrationWindow
} from "@/server/database/registrationStore";
import { type CourseId } from "@/server/data/courses";
import { revalidatePath } from "next/cache";

export type RegistrationResult =
  | { ok: true }
  | { ok: false; error: string };

export type RegistrationStatusResult =
  | { ok: true; isOpen: boolean; openUntil: string | null }
  | { ok: false; error: string };

/**
 * Admin-only server action to open the registration window for a course.
 * Sets registrationOpenUntil to 15 minutes from now.
 */
export async function openRegistrationAction(
  courseId: CourseId
): Promise<RegistrationResult> {
  const session = await getSession();

  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    await openRegistration(courseId);

    // Revalidate admin pages
    revalidatePath(`/admin/${courseId}`, "page");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to open registration",
    };
  }
}

/**
 * Admin-only server action to close the registration window for a course.
 * Sets registrationOpenUntil to null.
 */
export async function closeRegistrationAction(
  courseId: CourseId
): Promise<RegistrationResult> {
  const session = await getSession();

  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    await closeRegistration(courseId);

    // Revalidate admin pages
    revalidatePath(`/admin/${courseId}`, "page");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to close registration",
    };
  }
}

/**
 * Get the current registration status for a course.
 */
export async function getRegistrationStatusAction(
  courseId: CourseId
): Promise<RegistrationStatusResult> {
  const session = await getSession();

  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    const isOpen = await isRegistrationOpen(courseId);
    const openUntil = await getRegistrationWindow(courseId);

    return { ok: true, isOpen, openUntil };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to get registration status",
    };
  }
}
