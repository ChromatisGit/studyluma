import type { ProgressDTO } from "./progressDTO";

export type SidebarCourseDTO = {
  id: string;
  label: string;
  href: string;
};

export type SidebarDTO = ProgressDTO & {
  courses: SidebarCourseDTO[];
  isAuthenticated: boolean;
  primaryGroupKey?: string;
  accessCode?: string;
};
