import "server-only";

import type { SidebarCourseDTO } from "@/domain/sidebarDTO";
import { isAdmin, type User } from "@/domain/userTypes";
import { getCoursesByAccess, getPublicCourses } from "./courses";
import { getCourseDTO } from "./getCourseDTO";

export function getNavbarCourses(user: User): SidebarCourseDTO[] {
  if (isAdmin(user)) {
    return [];
  }

  const { accessible } = getCoursesByAccess(user);

  return accessible.map((id) => {
    const { label, slug } = getCourseDTO(id);
    return { id, label, href: slug };
  });
}

export function getPublicNavbarCourses(): SidebarCourseDTO[] {
  const publicCourseIds = getPublicCourses();

  return publicCourseIds.map((id) => {
    const { label, slug } = getCourseDTO(id);
    return { id, label, href: slug };
  });
}

export type NavbarCourses = SidebarCourseDTO[];

