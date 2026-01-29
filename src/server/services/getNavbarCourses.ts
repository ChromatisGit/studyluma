import "server-only";

import type { SidebarCourseDTO } from "@schema/sidebarDTO";
import { type User } from "@schema/userTypes";
import { getCoursesByAccess } from "./courseService";
import { getCourseDTO } from "./getCourseDTO";

export function getNavbarCourses(user: User): SidebarCourseDTO[] {
  const { accessible } = getCoursesByAccess(user);

  return accessible.map((id) => {
    const { label, slug } = getCourseDTO(id);
    return { id, label, href: slug };
  });
}

export function getPublicNavbarCourses(): SidebarCourseDTO[] {
  const { public: publicCourses } = getCoursesByAccess(null);

  return publicCourses.map((id) => {
    const { label, slug } = getCourseDTO(id);
    return { id, label, href: slug };
  });
}

export type NavbarCourses = SidebarCourseDTO[];


