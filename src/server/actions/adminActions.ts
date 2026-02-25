"use server";

import { getSession, isAdmin } from "@services/authService";
import {
  toggleWorksheetVisibilityService,
  type CourseId,
} from "@services/courseService";
import { getWorksheetMonitorService, type WorksheetMonitorData } from "@services/worksheetService";
import { revalidatePath } from "next/cache";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

/**
 * Toggle the is_hidden flag for a worksheet in a course.
 * Admin only.
 */
export async function toggleWorksheetVisibilityAction(
  courseId: CourseId,
  worksheetId: string,
  isHidden: boolean,
): Promise<AdminActionResult> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    await toggleWorksheetVisibilityService(session.user, courseId, worksheetId, isHidden);
    revalidatePath(`/admin/${courseId}`);
    return { ok: true };
  } catch (error) {
    console.error("[Admin] Failed to toggle worksheet visibility:", error);
    return { ok: false, error: "Failed to update worksheet visibility." };
  }
}

/**
 * Returns live presence distribution and checkpoint stats for a worksheet.
 * Admin only.
 */
export async function getWorksheetMonitorAction(
  courseId: CourseId,
  worksheetId: string,
): Promise<WorksheetMonitorData | null> {
  const session = await getSession();
  if (!session || !isAdmin(session.user)) return null;

  try {
    return await getWorksheetMonitorService(session.user, courseId, worksheetId);
  } catch (error) {
    console.error("[Admin] Failed to fetch worksheet monitor data:", error);
    return null;
  }
}
