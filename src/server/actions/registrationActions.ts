"use server";

import type { CourseId } from "@services/courseService";
import { getSession } from "@services/authService";
import { isAdmin } from "@schema/userTypes";
import {
  closeRegistration,
  getRegistrationWindow,
  openRegistration,
} from "@services/courseStateService";
import { getClientIp } from "@server-lib/getClientIp";

export type RegistrationStatusResult =
  | { ok: true; isOpen: boolean; openUntil: string | null }
  | { ok: false; error: string };

export type RegistrationActionResult =
  | { ok: true; openUntil: string | null }
  | { ok: false; error: string };

export async function getRegistrationStatusAction(
  courseId: CourseId
): Promise<RegistrationStatusResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  const openUntil = await getRegistrationWindow(courseId);
  return { ok: true, isOpen: Boolean(openUntil), openUntil };
}

export async function openRegistrationAction(
  courseId: CourseId
): Promise<RegistrationActionResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    const openUntil = await openRegistration(
      courseId,
      session.user.id,
      await getClientIp()
    );
    return { ok: true, openUntil: openUntil.toISOString() };
  } catch {
    return { ok: false, error: "Failed to open registration." };
  }
}

export async function closeRegistrationAction(
  courseId: CourseId
): Promise<RegistrationActionResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    await closeRegistration(courseId);
    return { ok: true, openUntil: null };
  } catch {
    return { ok: false, error: "Failed to close registration." };
  }
}

