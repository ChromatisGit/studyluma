"use server";

import { getSession } from "@/server/auth/auth";
import { isAdmin } from "@/domain/userTypes";
import { setProgressCursor } from "@/server/data/getProgressDTO";
import { clearProgressCache } from "@/server/database/progressStore";
import { getCourseGroupAndSubjectKey, type CourseId } from "@/server/data/courses";
import { revalidatePath } from "next/cache";

export type SetProgressResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Admin-only server action to update course progress.
 * Updates the current chapter for all students in a course.
 */
export async function setProgressAction(
  courseId: CourseId,
  topicId: string,
  chapterId: string
): Promise<SetProgressResult> {
  const session = await getSession();

  if (!session || !isAdmin(session.user)) {
    return { ok: false, error: "Unauthorized. Admin access required." };
  }

  try {
    await setProgressCursor(courseId, topicId, chapterId);

    // Clear the progress cache to force reload from file
    clearProgressCache();

    // Revalidate all pages that depend on progress
    revalidatePath("/", "layout");

    // Also revalidate the specific course pages
    const { groupKey, subjectKey } = getCourseGroupAndSubjectKey(courseId);
    revalidatePath(`/${groupKey}/${subjectKey}`, "page");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update progress",
    };
  }
}
