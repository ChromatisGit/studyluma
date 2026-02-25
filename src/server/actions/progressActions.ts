"use server";

import { getSession, isAdmin } from "@services/authService";
import { getCourseSlug, type CourseId } from "@services/courseService";
import { setCourseProgress } from "@services/courseService";
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
    await setCourseProgress(courseId, topicId, chapterId);

    // Revalidate all pages that depend on progress
    revalidatePath("/", "layout");

    // Also revalidate the specific course pages
    const slug = await getCourseSlug(courseId);
    revalidatePath(slug, "page");

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Failed to update progress",
    };
  }
}

