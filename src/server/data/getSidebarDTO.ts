import "server-only";

import type { SidebarDTO } from "@/domain/sidebarDTO";
import { isAdmin, type User } from "@/domain/userTypes";
import type { CourseId } from "./courses";
import { getNavbarCourses, getPublicNavbarCourses } from "./getNavbarCourses";
import { getProgressDTO } from "./getProgressDTO";
import { getUserAccessCode } from "../auth/auth";

const EMPTY_PROGRESS = { currentTopicId: "", currentChapterId: "", topics: [] };

export async function getSidebarDTO({
  courseId,
  user,
}: {
  courseId?: CourseId | null;
  user: User | null;
}): Promise<SidebarDTO> {
  const isAuthenticated = Boolean(user);
  const primaryGroupKey = user && !isAdmin(user) ? user.groupKey : undefined;

  // Get courses for navbar: authenticated users see their accessible courses,
  // unauthenticated users see public courses
  const courses =
    user ? getNavbarCourses(user) : getPublicNavbarCourses();

  const progress = courseId ? await getProgressDTO(courseId) : EMPTY_PROGRESS;

  // Get access code for authenticated non-admin users
  const accessCode =
    user && !isAdmin(user) ? (await getUserAccessCode(user.id)) ?? undefined : undefined;

  return {
    ...progress,
    courses,
    isAuthenticated,
    primaryGroupKey,
    accessCode,
  };
}
